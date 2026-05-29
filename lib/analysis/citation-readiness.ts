import type { WeakPoint } from "./weak-points-checker"

// Минимальный набор полей, доступных в ReportDashboard (локальный интерфейс)
interface MinimalPlatformScore {
  mentionCount: number
  totalQueries: number
  sourceQualityScore?: number
}

export interface CitationReadinessResult {
  score: number           // 0–100 итоговый
  contextual: number      // 0–100: standalone definition, FAQ, "answer-first"
  structural: number      // 0–100: schema markup, llms.txt, AI-bot access
  referential: number     // 0–100: качество источников, цитирование
  capApplied: boolean
  signals: string[]       // список найденных проблем
}

const STRUCTURAL_WEAK_IDS = new Set([
  "missing-schema",
  "alisa-no-speakable-schema",
  "alisa-possible-bot-block",
  "grok-xai-bot-blocked",
])

const CONTEXTUAL_WEAK_IDS = new Set([
  "entity-signals",
  "not-first-in-recommendations",
  "missing-comparison-presence",
])

const REFERENTIAL_WEAK_IDS = new Set([
  "no-source-citations",
  "chatgpt-no-wikipedia",
  "perplexity-no-reddit",
  "gemini-no-youtube",
  "claude-brave-search-gap",
  "gigachat-no-business-media",
  "yandexgpt-no-zen-dzen",
])

export function calculateCitationReadiness(
  weakPoints: WeakPoint[],
  platformScores: Record<string, MinimalPlatformScore>
): CitationReadinessResult {
  const detectedIds = new Set(weakPoints.map((w) => w.id))
  const signals: string[] = []

  // ── Structural (0–100) ────────────────────────────────────────────────────
  // Базовый балл — 100, снимаем за каждый структурный weak point
  let structural = 100
  for (const id of STRUCTURAL_WEAK_IDS) {
    if (detectedIds.has(id)) {
      const wp = weakPoints.find((w) => w.id === id)!
      const penalty = wp.severity === "high" ? 35 : wp.severity === "medium" ? 20 : 10
      structural -= penalty
      signals.push(wp.title)
    }
  }
  structural = Math.max(0, structural)

  // ── Referential (0–100) ───────────────────────────────────────────────────
  // Берём средний sourceQualityScore по платформам + штраф за отсутствие в источниках
  const sourceScores = Object.values(platformScores).map((s) => s.sourceQualityScore ?? 0)
  const avgSourceQuality = sourceScores.length > 0
    ? sourceScores.reduce((a, b) => a + b, 0) / sourceScores.length
    : 0

  let referential = Math.round(avgSourceQuality)
  for (const id of REFERENTIAL_WEAK_IDS) {
    if (detectedIds.has(id)) {
      const wp = weakPoints.find((w) => w.id === id)!
      const penalty = wp.severity === "high" ? 20 : 10
      referential -= penalty
      if (!signals.includes(wp.title)) signals.push(wp.title)
    }
  }
  referential = Math.max(0, Math.min(100, referential))

  // ── Contextual (0–100) ────────────────────────────────────────────────────
  // Основан на mention rate + позиционных слабостях
  const avgMentionRate = Object.values(platformScores).reduce((sum, s) => {
    return sum + (s.mentionCount / Math.max(s.totalQueries, 1))
  }, 0) / Math.max(Object.keys(platformScores).length, 1)

  let contextual = Math.round(avgMentionRate * 100)
  for (const id of CONTEXTUAL_WEAK_IDS) {
    if (detectedIds.has(id)) {
      const wp = weakPoints.find((w) => w.id === id)!
      const penalty = wp.severity === "high" ? 20 : 12
      contextual -= penalty
      if (!signals.includes(wp.title)) signals.push(wp.title)
    }
  }
  contextual = Math.max(0, Math.min(100, contextual))

  // ── Итоговый score ────────────────────────────────────────────────────────
  const rawScore = Math.round((contextual + structural + referential) / 3)

  // Cap: если нет ни одного упоминания ни на одной платформе → не больше 25
  const zeroMentions = Object.values(platformScores).every((s) => s.mentionCount === 0)
  const capApplied = zeroMentions && rawScore > 25
  const score = capApplied ? Math.min(rawScore, 25) : rawScore

  return { score, contextual, structural, referential, capApplied, signals }
}
