import type { MentionContext } from "@/lib/agents/semantic-analysis-types"

/**
 * Классифицирует роль бренда в ответе ИИ на основе уже вычисленных сигналов.
 * Лёгкая rule-based классификация — без дополнительных AI-вызовов.
 *
 * positionScore:
 *   0 = absent (не упомянут)
 *   1 = first  (первый в списке или первые 15% ответа)
 *   2 = early  (первые 33%)
 *   3 = middle (33–67%)
 *   4 = late   (67–100%)
 */
export function classifyMentionContext(
  response: string,
  brandName: string,
  positionScore: number,
  sentiment: string
): MentionContext | null {
  if (positionScore === 0) return null

  const lower = response.toLowerCase()
  const brand = brandName.toLowerCase()

  // Явные негативные сигналы вокруг бренда → WARNING
  const negativePatterns = [
    "не рекомендуем", "осторожно", "проблем", "жалоб", "мошенни",
    "avoid", "scam", "unreliable", "not recommended", "warning",
  ]
  const contextWindow = extractContext(response, brandName, 400).toLowerCase()
  if (sentiment === "negative" || negativePatterns.some((p) => contextWindow.includes(p))) {
    return "WARNING"
  }

  // Признаки нумерованного списка / явного сравнения → COMPARISON (если не первый)
  const isInList = /(?:\n|^)\s*(?:\d+[.)]\s|\*\s|-\s|•\s)/m.test(response)
  const isExplicitComparison = /\bvs\b|\bversus\b|сравн|альтернатив|или же|или\s+(?:же\s+)?выбрать/i.test(response)

  if (positionScore === 1) {
    // Первый в списке или ранее всех — либо PRIMARY, либо COMPARISON-лидер
    if (isExplicitComparison) return "COMPARISON"
    // Позитивный контекст или рекомендательные слова → PRIMARY
    const primaryPatterns = [
      "рекоменд", "лучш", "советуем", "выбирают", "№1", "первый выбор", "топ",
      "recommend", "best", "top choice", "leading", "#1",
    ]
    if (sentiment === "positive" || primaryPatterns.some((p) => contextWindow.includes(p))) {
      return "PRIMARY_RECOMMENDATION"
    }
    return isInList ? "COMPARISON" : "PRIMARY_RECOMMENDATION"
  }

  if (positionScore === 2) {
    // Рано, но не первый — скорее всего сравнение или альтернатива
    return isInList || isExplicitComparison ? "COMPARISON" : "ALTERNATIVE"
  }

  if (positionScore === 3) {
    return "ALTERNATIVE"
  }

  // positionScore === 4 (поздно в тексте, вскользь)
  return "REFERENCE"
}

/**
 * Упрощённая 3-значная классификация для UI и аналитики.
 * Выводится из MentionContext.
 */
export function brandRoleFromContext(ctx: MentionContext | null): "PRIMARY" | "ALTERNATIVE" | "MENTION" | null {
  if (!ctx) return null
  if (ctx === "PRIMARY_RECOMMENDATION") return "PRIMARY"
  if (ctx === "COMPARISON" || ctx === "ALTERNATIVE") return "ALTERNATIVE"
  return "MENTION" // REFERENCE | WARNING
}

/**
 * Вычисляет агрегированную роль бренда по всем QueryResult одного аудита.
 * Возвращает процент запросов где бренд PRIMARY / ALTERNATIVE / MENTION.
 */
export function aggregateBrandRoles(
  results: { mentionContext?: string | null; brandMentioned: boolean }[]
): {
  primary: number
  alternative: number
  mention: number
  total: number
  primaryPct: number
  alternativePct: number
  mentionPct: number
} {
  const mentioned = results.filter((r) => r.brandMentioned)
  const total = mentioned.length

  let primary = 0
  let alternative = 0
  let mention = 0

  for (const r of mentioned) {
    const role = brandRoleFromContext(r.mentionContext as MentionContext | null)
    if (role === "PRIMARY") primary++
    else if (role === "ALTERNATIVE") alternative++
    else mention++ // MENTION or null
  }

  const safe = total || 1
  return {
    primary,
    alternative,
    mention,
    total,
    primaryPct: Math.round((primary / safe) * 100),
    alternativePct: Math.round((alternative / safe) * 100),
    mentionPct: Math.round((mention / safe) * 100),
  }
}

function extractContext(text: string, keyword: string, windowSize: number): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return ""
  const start = Math.max(0, idx - windowSize / 2)
  const end = Math.min(text.length, idx + windowSize / 2)
  return text.slice(start, end)
}
