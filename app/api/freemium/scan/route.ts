import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runWebsiteAnalysisAgent } from "@/lib/agents/website-analysis-agent"
import { runFreemiumQuickCheck } from "@/lib/freemium/quick-check"
import { z } from "zod"
import { checkRateLimit } from "@/lib/rate-limit"

const ScanSchema = z.object({
  websiteUrl: z.string().url(),
  source: z.string().max(64).optional(),
})

export async function POST(req: NextRequest) {
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
    const { websiteUrl, source } = ScanSchema.parse(body)

    // Check for recent scan of same URL (cache for 24h)
    const existing = await prisma.freemiumScan.findFirst({
      where: {
        websiteUrl,
        quickCheckDone: true,
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

    const companyName = analysis.companyName || new URL(websiteUrl).hostname
    const niche = analysis.niche || "Общее"
    const keywords = analysis.keywords as string[]

    // ── Step 2: Real AI quick check (3 platforms × 3 queries) ────────────
    let quickCheck
    let previewScore: number
    let platformScoresJson: object | null = null
    let quickCheckDone = false

    try {
      quickCheck = await runFreemiumQuickCheck(companyName, niche, websiteUrl, keywords)
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
        services: asStringArray(analysis.services),
        keywords: asStringArray(analysis.keywords),
        suggestedCompetitors: asStringArray(analysis.suggestedCompetitors),
        previewScore,
        platformScores: platformScoresJson ?? undefined,
        quickCheckDone,
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
