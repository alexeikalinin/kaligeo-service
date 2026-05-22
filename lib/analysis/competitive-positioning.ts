import type { QueryResult } from "@prisma/client"
import type { QueryCategory } from "./share-of-voice"

export type PositioningStrength = "strong" | "competitive" | "weak"

export interface CompetitorRanking {
  name: string
  mentionCount: number
  mentionShare: number  // % от всех конкурентных упоминаний
}

export interface CompetitivePosition {
  /** Место бренда среди бренд + конкуренты (1 = лидер) */
  rank: number
  /** Общее кол-во участников в рейтинге (бренд + конкуренты) */
  totalParticipants: number
  /** Доля бренда в конкурентных упоминаниях 0–100 */
  mentionShare: number
  /** % запросов, где бренд упомянут первым (positionScore === 1) */
  firstMentionRate: number
  /** Качественная оценка позиции */
  positioningStrength: PositioningStrength
  /** Ранжирование по категориям запросов */
  categoryRanking: Record<QueryCategory, { rank: number; total: number }>
  /** Топ-конкуренты с их долями */
  competitors: CompetitorRanking[]
}

function classifyQuery(query: string): QueryCategory {
  const q = query.toLowerCase()
  if (/топ|лучш|рейтинг|best|top|leader|рекоменд|recommend/.test(q)) return "recommendation"
  if (/\bvs\b|или|сравн|против|compare|versus|лучше/.test(q)) return "comparison"
  if (/первый|лидер|занимает|первое место|кто .+ рынк/.test(q)) return "position"
  if (/как|проблем|помощь|решить|issue|problem|help/.test(q)) return "problem"
  return "conversational"
}

export function calculateCompetitivePosition(
  results: QueryResult[],
  competitors: string[]
): CompetitivePosition {
  // ── Считаем упоминания ───────────────────────────────────────────────────────
  let brandMentions = 0
  let brandFirstMentions = 0
  const competitorCounts: Record<string, number> = {}

  for (const comp of competitors) {
    competitorCounts[comp] = 0
  }

  for (const r of results) {
    if (r.brandMentioned) {
      brandMentions++
      if ((r as QueryResult & { positionScore: number }).positionScore === 1) brandFirstMentions++
    }
    for (const comp of r.competitors as string[]) {
      competitorCounts[comp] = (competitorCounts[comp] ?? 0) + 1
    }
  }

  // ── Ранжирование ────────────────────────────────────────────────────────────
  const allParticipants = [
    { name: "__brand__", count: brandMentions },
    ...Object.entries(competitorCounts).map(([name, count]) => ({ name, count })),
  ].sort((a, b) => b.count - a.count)

  const rank = allParticipants.findIndex((p) => p.name === "__brand__") + 1
  const totalParticipants = allParticipants.length

  const totalCompetitorMentions = Object.values(competitorCounts).reduce((a, b) => a + b, 0)
  const totalAllMentions = brandMentions + totalCompetitorMentions
  const mentionShare = totalAllMentions > 0
    ? Math.round((brandMentions / totalAllMentions) * 100)
    : 0

  const firstMentionRate = results.length > 0
    ? Math.round((brandFirstMentions / results.length) * 100)
    : 0

  // ── Сила позиции ────────────────────────────────────────────────────────────
  let positioningStrength: PositioningStrength
  if (rank === 1 && mentionShare >= 40) {
    positioningStrength = "strong"
  } else if (rank <= 2 || mentionShare >= 25) {
    positioningStrength = "competitive"
  } else {
    positioningStrength = "weak"
  }

  // ── По категориям ────────────────────────────────────────────────────────────
  const categories: QueryCategory[] = ["recommendation", "comparison", "position", "problem", "conversational"]
  const categoryRanking: Record<QueryCategory, { rank: number; total: number }> = {
    recommendation: { rank: 1, total: 1 },
    comparison: { rank: 1, total: 1 },
    position: { rank: 1, total: 1 },
    problem: { rank: 1, total: 1 },
    conversational: { rank: 1, total: 1 },
  }

  for (const cat of categories) {
    const catResults = results.filter((r) => classifyQuery(r.query) === cat)
    if (catResults.length < 2) continue  // недостаточно данных

    let catBrand = 0
    const catComp: Record<string, number> = {}
    for (const r of catResults) {
      if (r.brandMentioned) catBrand++
      for (const comp of r.competitors as string[]) {
        catComp[comp] = (catComp[comp] ?? 0) + 1
      }
    }

    const catAll = [
      { name: "__brand__", count: catBrand },
      ...Object.entries(catComp).map(([name, count]) => ({ name, count })),
    ].sort((a, b) => b.count - a.count)

    const catRank = catAll.findIndex((p) => p.name === "__brand__") + 1
    categoryRanking[cat] = { rank: catRank, total: catAll.length }
  }

  // ── Список конкурентов ───────────────────────────────────────────────────────
  const competitorsList: CompetitorRanking[] = Object.entries(competitorCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, count]) => ({
      name,
      mentionCount: count,
      mentionShare: totalAllMentions > 0 ? Math.round((count / totalAllMentions) * 100) : 0,
    }))

  return {
    rank,
    totalParticipants,
    mentionShare,
    firstMentionRate,
    positioningStrength,
    categoryRanking,
    competitors: competitorsList,
  }
}
