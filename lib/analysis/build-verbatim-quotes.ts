import type { VerbatimQuote } from "@/components/report/VerbatimInsights"

interface QueryResultLike {
  platform: string
  query: string
  response: string
  brandMentioned: boolean
  competitors: string[]
  mentionQuality: number | null
}

const MAX_QUOTES = 8
const EXCERPT_LENGTH = 400

/**
 * Отбирает реальные QueryResult для вкладки «Дословно: что AI говорит» — без LLM.
 * Приоритет: записи с брендом+конкурентами вместе (есть что сравнить), затем
 * по mentionQuality (Волна 3), максимум по одной на платформу.
 */
export function buildVerbatimQuotes(results: QueryResultLike[]): VerbatimQuote[] {
  const candidates = results.filter((r) => r.brandMentioned || r.competitors.length > 0)

  const sorted = [...candidates].sort((a, b) => {
    const aScore = (a.mentionQuality ?? 0) + (a.brandMentioned && a.competitors.length > 0 ? 50 : 0)
    const bScore = (b.mentionQuality ?? 0) + (b.brandMentioned && b.competitors.length > 0 ? 50 : 0)
    return bScore - aScore
  })

  const seenPlatforms = new Set<string>()
  const picked: QueryResultLike[] = []

  for (const r of sorted) {
    if (seenPlatforms.has(r.platform)) continue
    seenPlatforms.add(r.platform)
    picked.push(r)
    if (picked.length >= MAX_QUOTES) break
  }

  return picked.map((r) => ({
    platform: r.platform,
    query: r.query,
    excerpt: r.response.length > EXCERPT_LENGTH ? r.response.slice(0, EXCERPT_LENGTH) + "…" : r.response,
    brandsMentioned: r.competitors,
    isOurs: r.brandMentioned,
  }))
}
