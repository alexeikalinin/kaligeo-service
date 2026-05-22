/**
 * Типы и константы для семантического анализа упоминаний.
 * Вынесены отдельно чтобы их можно было импортировать в Client Components
 * без подтягивания серверных зависимостей (prisma, pg и т.д.)
 */

export type MentionContext =
  | "PRIMARY_RECOMMENDATION"  // «Лучший выбор», «Я рекомендую X», первое место в списке
  | "COMPARISON"              // X vs Y, включён в сравнительный список
  | "ALTERNATIVE"             // «Ещё можно рассмотреть X», вторичный вариант
  | "REFERENCE"               // Упомянут вскользь, без явной оценки
  | "WARNING"                 // «X имеет проблемы», «осторожно с X»

export interface MentionClassification {
  queryResultId: string
  mentionContext: MentionContext
  mentionQuality: number  // 0–100
  rationale: string       // краткое объяснение (для отладки)
}

export const MENTION_CONTEXT_LABELS: Record<MentionContext, { label: string; color: string; bg: string }> = {
  PRIMARY_RECOMMENDATION: { label: "Топ-рекомендация", color: "#166534", bg: "#dcfce7" },
  COMPARISON:             { label: "Сравнение",         color: "#1e40af", bg: "#dbeafe" },
  ALTERNATIVE:            { label: "Альтернатива",      color: "#854d0e", bg: "#fef9c3" },
  REFERENCE:              { label: "Упоминание",        color: "#374151", bg: "#f3f4f6" },
  WARNING:                { label: "Предостережение",   color: "#991b1b", bg: "#fee2e2" },
}
