import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runWebsiteAnalysisAgent } from "@/lib/agents/website-analysis-agent"
import { z } from "zod"

const ScanSchema = z.object({
  websiteUrl: z.string().url(),
  source: z.string().max(64).optional(),
})

// Estimate an AI-visibility preview score (deliberately low to show room for improvement)
function estimatePreviewScore(
  niche: string,
  services: string[],
  keywords: string[]
): number {
  let score = 10

  // More content signals → marginally higher base
  if (services.length >= 3) score += 5
  if (keywords.length >= 5) score += 5
  if (niche.length > 100) score += 3

  // Check if niche mentions AI-friendly terms
  const aiTerms = ["ai", "chatgpt", "llm", "нейро", "искусственный", "автомат"]
  const hasAiTerms = aiTerms.some(
    (t) => niche.toLowerCase().includes(t) || services.join(" ").toLowerCase().includes(t)
  )
  if (hasAiTerms) score += 7

  // Cap at 42 — freemium always shows there's room to grow
  return Math.min(score, 42)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { websiteUrl, source } = ScanSchema.parse(body)

    // Check for recent scan of same URL (cache for 24h)
    const existing = await prisma.freemiumScan.findFirst({
      where: {
        websiteUrl,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    })

    if (existing) {
      return NextResponse.json({ scanId: existing.id })
    }

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

    const previewScore = estimatePreviewScore(
      analysis.niche,
      analysis.services,
      analysis.keywords
    )

    const scan = await prisma.freemiumScan.create({
      data: {
        websiteUrl,
        companyName: analysis.companyName || new URL(websiteUrl).hostname,
        niche: analysis.niche || "Не определено",
        services: analysis.services,
        keywords: analysis.keywords,
        previewScore,
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
