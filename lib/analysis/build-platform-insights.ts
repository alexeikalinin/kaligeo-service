export interface PlatformInsight {
  platform: string
  score: number
  insight: string
  topSignal: string
  yourStatus: "strong" | "average" | "weak"
  actionHint: string
}

/**
 * Строит PlatformInsight[] из уже посчитанных visibilityScores — без LLM.
 * insight/topSignal/actionHint оставляем пустыми: PlatformIntelligence сам
 * подставляет честный статический текст по платформе через getStaticData()
 * (components/report/PlatformIntelligence.tsx), когда поле пустое.
 */
export function buildPlatformInsights(
  visibilityScores: Record<string, { score: number }>
): PlatformInsight[] {
  return Object.entries(visibilityScores).map(([platform, data]) => ({
    platform,
    score: data.score,
    yourStatus: data.score >= 60 ? "strong" : data.score >= 30 ? "average" : "weak",
    insight: "",
    topSignal: "",
    actionHint: "",
  }))
}
