import type { QueryResult } from "@prisma/client"

export interface PlatformScore {
  platform: string
  score: number
  totalQueries: number
  mentionCount: number
  positiveCount: number
  citationRate: number
  avgPosition: number       // 0–4 (0=не упомянут, 1=первый, 4=поздно)
  positionScore100: number  // 0–100 (нормализованный для отображения)
  sourceQualityScore: number // 0–100 (доля media/expert/catalog источников среди всех)
}

/**
 * Новая формула скоринга GEO 2026:
 * 40% citationRate   — упоминают ли вообще
 * 25% positiveRate   — как описывают
 * 20% positionAvg    — на каком месте в ответе (1=лучше)
 * 15% sourceRate     — цитируют ли сайт как источник
 */
export function calculateVisibilityScores(results: QueryResult[]): Record<string, PlatformScore> {
  const byPlatform: Record<string, QueryResult[]> = {}

  for (const r of results) {
    if (!byPlatform[r.platform]) byPlatform[r.platform] = []
    byPlatform[r.platform].push(r)
  }

  const scores: Record<string, PlatformScore> = {}

  for (const [platform, platformResults] of Object.entries(byPlatform)) {
    const total = platformResults.length
    const mentions = platformResults.filter((r) => r.brandMentioned).length
    const positives = platformResults.filter((r) => r.sentiment === "positive").length
    const citationRate = total > 0 ? mentions / total : 0
    const positiveRate = mentions > 0 ? positives / mentions : 0

    // Source presence rate
    const sourcedMentions = platformResults.filter(
      (r) => r.brandMentioned && (r.sources as string[]).length > 0
    ).length
    const sourceRate = mentions > 0 ? sourcedMentions / mentions : 0

    // Position average (только по упомянутым результатам с positionScore > 0)
    const positionScores = platformResults
      .filter((r) => r.brandMentioned && (r as any).positionScore > 0)
      .map((r) => (r as any).positionScore as number)
    const avgPosition = positionScores.length > 0
      ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
      : 0
    // Нормализуем: position 1 = 100, position 4 = 25, position 0 (нет данных) = 50 нейтрально
    const positionNorm = avgPosition > 0 ? Math.max(0, 100 - (avgPosition - 1) * 25) : 50

    // Source quality: доля media+expert+catalog среди всех источников (не только упоминания)
    let qualitySourceCount = 0
    let totalSourceCount = 0
    for (const r of platformResults) {
      const cats = (r as any).sourceCategories as Record<string, string[]> | null
      if (cats) {
        const quality = [...(cats.media ?? []), ...(cats.expert ?? []), ...(cats.catalog ?? [])].length
        const all = Object.values(cats).flat().length
        qualitySourceCount += quality
        totalSourceCount += all
      }
    }
    const sourceQualityScore = totalSourceCount > 0
      ? Math.round((qualitySourceCount / totalSourceCount) * 100)
      : 0

    const score = Math.round(
      citationRate * 40 +
      positiveRate * 25 +
      (positionNorm / 100) * 20 +
      sourceRate * 15
    )

    scores[platform] = {
      platform,
      score,
      totalQueries: total,
      mentionCount: mentions,
      positiveCount: positives,
      citationRate: Math.round(citationRate * 100),
      avgPosition: Math.round(avgPosition * 10) / 10,
      positionScore100: Math.round(positionNorm),
      sourceQualityScore,
    }
  }

  return scores
}

export function calculateOverallScore(platformScores: Record<string, PlatformScore>): number {
  const values = Object.values(platformScores)
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, s) => sum + s.score, 0) / values.length)
}
