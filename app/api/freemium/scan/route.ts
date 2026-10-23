import { NextRequest, NextResponse } from "next/server"
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors"
import { prisma } from "@/lib/prisma"
import { runWebsiteAnalysisAgent } from "@/lib/agents/website-analysis-agent"
import { runFreemiumQuickCheck } from "@/lib/freemium/quick-check"
import { z } from "zod"
import { checkRateLimit } from "@/lib/rate-limit"
import { marketFromOrigin } from "@/lib/market"

const ScanSchema = z.object({
  websiteUrl: z.string().url(),
  companyName: z.string().trim().max(100).optional(),
  niche: z.string().trim().max(200).optional(),
  source: z.string().max(64).optional(),
  market: z.enum(["by", "ru"]).optional(),
})

async function handlePost(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  const allowed = await checkRateLimit(`rl:freemium:${ip}`, 10, 3600) // 10/hour
  if (!allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте через час." },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const { websiteUrl, companyName: submittedName, niche: submittedNiche, source, market: bodyMarket } = ScanSchema.parse(body)
    const market = bodyMarket ?? marketFromOrigin(req.headers.get("origin"))

    await prisma.serviceInquiry.create({ data: { kind: "freemium", payload: JSON.parse(JSON.stringify({ websiteUrl, submittedName, submittedNiche, source, market })) } })

    // Check for recent scan of same URL for THIS market (cache for 24h).
    // Scoped by market so a .ru and a .by lead for the same site never share
    // (and race to overwrite) one another's scan record.
    const existing = await prisma.freemiumScan.findFirst({
      where: {
        websiteUrl,
        market,
        quickCheckDone: true,
        ...(submittedNiche ? { niche: submittedNiche } : {}),
        ...(submittedName ? { companyName: submittedName } : {}),
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    })

    if (existing) {
      return NextResponse.json({ scanId: existing.id })
    }

    // ── Step 1: Website analysis ──────────────────────────────────────────
    let analysis
    try {
      analysis = await runWebsiteAnalysisAgent(websiteUrl)
    } catch (agentError) {
      console.error("Website analysis agent failed, using fallback:", agentError)
      analysis = {
        companyName: "",
        niche: "",
        description: "",
        services: [] as string[],
        targetAudience: "",
        keywords: [] as string[],
        suggestedCompetitors: [] as string[],
      }
    }

    const companyName = submittedName || analysis.companyName || new URL(websiteUrl).hostname
    const niche = submittedNiche || analysis.niche?.trim()
    if (!niche || niche === "Общее") {
      return NextResponse.json({ error: "Не удалось определить нишу по сайту. Отправьте обращение через «Контакты»: укажите название компании, услуги и ссылку на сайт или соцсеть.", code: "NICHE_REQUIRED" }, { status: 422 })
    }
    const keywords = analysis.keywords as string[]
    // A legal entity may differ from the public brand used in AI recommendations.
    const legalEntityName = /^(?:ИП|ООО|ОАО|ЗАО|АО|ЧУП|ОДО)(?:\s|[«"])/i.test(companyName)
    const brandName = legalEntityName ? analysis.companyName?.trim() || companyName : companyName

    // ── Step 2: Real AI quick check (3 platforms × 3 queries) ────────────
    let quickCheck
    let previewScore: number
    let platformScoresJson: object | null = null
    let quickCheckDone = false

    try {
      quickCheck = await runFreemiumQuickCheck(brandName, niche, websiteUrl, keywords)
      previewScore = quickCheck.overallScore
      platformScoresJson = quickCheck.platformScores
      quickCheckDone = quickCheck.queriesRun > 0
    } catch (quickCheckError) {
      console.error("Quick check failed, falling back to estimate:", quickCheckError)
      // Fallback to honest low estimate
      previewScore = 12 + Math.min(keywords.length * 2, 10)
    }

    // ── Step 3: Persist ────────────────────────────────────────────────────
    // Gemini's JSON sometimes deviates from the requested array shape (e.g. a
    // prose string when it found no competitors) — coerce defensively so a
    // single malformed field doesn't crash the whole scan.
    const asStringArray = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : [])

    const scan = await prisma.freemiumScan.create({
      data: {
        websiteUrl,
        companyName,
        niche,
        analysisSnapshot: JSON.parse(JSON.stringify(analysis)),
        queryEvidence: quickCheck ? JSON.parse(JSON.stringify(quickCheck)) : undefined,
        services: asStringArray(analysis.services),
        keywords: asStringArray(analysis.keywords),
        suggestedCompetitors: asStringArray(analysis.suggestedCompetitors),
        previewScore,
        platformScores: platformScoresJson ?? undefined,
        quickCheckDone,
        market,
        ...(source ? { source } : {}),
      },
    })

    return NextResponse.json({ scanId: scan.id })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверный URL" }, { status: 400 })
    }
    console.error("Freemium scan error:", error)
    return NextResponse.json({ error: "Ошибка анализа сайта" }, { status: 500 })
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"))
}

export async function POST(req: NextRequest) {
  const response = await handlePost(req)
  new Headers(getCorsHeaders(req.headers.get("origin"))).forEach((value, key) => response.headers.set(key, value))
  response.headers.set("Vary", "Origin")
  return response
}
