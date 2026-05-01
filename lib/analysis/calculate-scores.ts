import type { QueryResult } from "@prisma/client"

export interface PlatformScore {
  platform: string
  score: number
  totalQueries: number
  mentionCount: number
  positiveCount: number
  citationRate: number
}

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

    // Score: 50% citation rate + 30% positive sentiment rate + 20% source presence
    const sourcedMentions = platformResults.filter(
      (r) => r.brandMentioned && (r.sources as string[]).length > 0
    ).length
    const sourceRate = mentions > 0 ? sourcedMentions / mentions : 0

    const score = Math.round(
      citationRate * 50 + (mentions > 0 ? positives / mentions : 0) * 30 + sourceRate * 20
    )

    scores[platform] = {
      platform,
      score,
      totalQueries: total,
      mentionCount: mentions,
      positiveCount: positives,
      citationRate: Math.round(citationRate * 100),
    }
  }

  return scores
}

export function calculateOverallScore(platformScores: Record<string, PlatformScore>): number {
  const values = Object.values(platformScores)
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, s) => sum + s.score, 0) / values.length)
}
