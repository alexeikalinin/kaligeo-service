import type { QueryResult } from "@prisma/client"

export type QueryCategory =
  | "recommendation"  // топ, лучший, рейтинг
  | "comparison"      // vs, сравни, или
  | "position"        // первый, лидер, кто занимает
  | "problem"         // как решить, помощь, проблема
  | "conversational"  // всё остальное

export interface ShareOfVoiceResult {
  /** Общий SoV: brand_mentions / (brand + all_competitor_mentions) × 100 */
  overall: number
  /** SoV по платформам */
  byPlatform: Record<string, number>
  /** SoV по типам запросов */
  byQueryCategory: Record<QueryCategory, number>
  /** Абсолютные данные для отображения (бренд vs топ-конкуренты) */
  mentionShare: {
    brand: number
    competitors: Record<string, number>
  }
}

function classifyQuery(query: string): QueryCategory {
  const q = query.toLowerCase()
  if (/топ|лучш|рейтинг|best|top|leader|рекоменд|recommend/.test(q)) return "recommendation"
  if (/\bvs\b|или|сравн|против|compare|versus|лучше/.test(q)) return "comparison"
  if (/первый|лидер|занимает|первое место|кто .+ рынк/.test(q)) return "position"
  if (/как|проблем|помощь|решить|issue|problem|help/.test(q)) return "problem"
  return "conversational"
}

export function calculateShareOfVoice(
  results: QueryResult[],
  brandName: string,
  competitors: string[]
): ShareOfVoiceResult {
  // ── Общий SoV ────────────────────────────────────────────────────────────────
  let totalBrandMentions = 0
  const competitorMentions: Record<string, number> = {}
  for (const comp of competitors) {
    competitorMentions[comp] = 0
  }

  for (const r of results) {
    if (r.brandMentioned) totalBrandMentions++
    const foundComps = r.competitors as string[]
    for (const comp of foundComps) {
      if (competitorMentions[comp] !== undefined) {
        competitorMentions[comp]++
      } else {
        // конкурент встречается, но не был в списке — считаем всё равно
        competitorMentions[comp] = (competitorMentions[comp] ?? 0) + 1
      }
    }
  }

  const totalCompMentions = Object.values(competitorMentions).reduce((a, b) => a + b, 0)
  const totalMentions = totalBrandMentions + totalCompMentions
  const overallSoV = totalMentions > 0
    ? Math.round((totalBrandMentions / totalMentions) * 100)
    : 0

  // ── SoV по платформам ────────────────────────────────────────────────────────
  const byPlatform: Record<string, number> = {}
  const platformGroups: Record<string, QueryResult[]> = {}
  for (const r of results) {
    if (!platformGroups[r.platform]) platformGroups[r.platform] = []
    platformGroups[r.platform].push(r)
  }

  for (const [platform, platformResults] of Object.entries(platformGroups)) {
    let brandCount = 0
    let compCount = 0
    for (const r of platformResults) {
      if (r.brandMentioned) brandCount++
      compCount += (r.competitors as string[]).length
    }
    const total = brandCount + compCount
    byPlatform[platform] = total > 0 ? Math.round((brandCount / total) * 100) : 0
  }

  // ── SoV по категориям запросов ───────────────────────────────────────────────
  const categoryGroups: Record<QueryCategory, QueryResult[]> = {
    recommendation: [],
    comparison: [],
    position: [],
    problem: [],
    conversational: [],
  }
  for (const r of results) {
    const cat = classifyQuery(r.query)
    categoryGroups[cat].push(r)
  }

  const byQueryCategory: Record<QueryCategory, number> = {
    recommendation: 0,
    comparison: 0,
    position: 0,
    problem: 0,
    conversational: 0,
  }
  for (const [cat, catResults] of Object.entries(categoryGroups) as [QueryCategory, QueryResult[]][]) {
    if (catResults.length === 0) continue
    let bCount = 0
    let cCount = 0
    for (const r of catResults) {
      if (r.brandMentioned) bCount++
      cCount += (r.competitors as string[]).length
    }
    const t = bCount + cCount
    byQueryCategory[cat] = t > 0 ? Math.round((bCount / t) * 100) : 0
  }

  // ── Нормализованные доли для pie chart ──────────────────────────────────────
  const topCompetitors = Object.entries(competitorMentions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .reduce<Record<string, number>>((acc, [name, count]) => {
      acc[name] = totalMentions > 0 ? Math.round((count / totalMentions) * 100) : 0
      return acc
    }, {})

  return {
    overall: overallSoV,
    byPlatform,
    byQueryCategory,
    mentionShare: {
      brand: overallSoV,
      competitors: topCompetitors,
    },
  }
}
