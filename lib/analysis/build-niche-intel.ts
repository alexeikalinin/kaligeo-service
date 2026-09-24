export interface NicheIntel {
  totalMentions: number
  topCompetitorMentions: number
  topCompetitorName: string
}

interface CompetitorEntry {
  name: string
  platforms: string[]
  mentionCount: number
}

interface PlatformScoreLike {
  mentionCount: number
}

/**
 * Строит nicheIntel из уже посчитанных данных отчёта — без LLM.
 * totalMentions — упоминания САМОГО бренда (совпадает с тем, что NicheIntelligence
 * использует для captureRate), topCompetitor* — из конкурентной матрицы.
 */
export function buildNicheIntel(
  visibilityScores: Record<string, PlatformScoreLike>,
  competitorMatrix: CompetitorEntry[]
): NicheIntel | undefined {
  if (competitorMatrix.length === 0) return undefined

  const top = [...competitorMatrix].sort((a, b) => b.mentionCount - a.mentionCount)[0]
  const totalMentions = Object.values(visibilityScores).reduce((sum, s) => sum + s.mentionCount, 0)

  return {
    totalMentions,
    topCompetitorMentions: top.mentionCount,
    topCompetitorName: top.name,
  }
}
