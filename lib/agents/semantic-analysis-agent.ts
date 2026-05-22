/**
 * Semantic Analysis Agent — Волна 3
 *
 * Для каждого QueryResult, где brandMentioned = true, классифицирует
 * контекст упоминания бренда и присваивает quality score 0–100.
 *
 * Использует claude-haiku-4-5 (дёшево, быстро, достаточно для классификации).
 * Запускается в ADVANCED / MONITOR_AGENT пайплайне параллельно с другими агентами.
 */

import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "../prisma"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Типы ──────────────────────────────────────────────────────────────────────

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

// Quality scores по типу упоминания (базовые)
const BASE_QUALITY: Record<MentionContext, number> = {
  PRIMARY_RECOMMENDATION: 90,
  COMPARISON:             60,
  ALTERNATIVE:            40,
  REFERENCE:              25,
  WARNING:                 5,
}

// ── Извлечь контекстное окно вокруг упоминания ─────────────────────────────

function extractContextWindow(text: string, brand: string, windowSize = 400): string {
  const idx = text.toLowerCase().indexOf(brand.toLowerCase())
  if (idx === -1) return text.slice(0, windowSize)
  const start = Math.max(0, idx - windowSize / 2)
  const end = Math.min(text.length, idx + windowSize / 2)
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "")
}

// ── Батч-классификация через Claude Haiku ────────────────────────────────────

const SYSTEM_PROMPT = `Ты классифицируешь контекст упоминания бренда в ответах AI-ассистентов.

Для каждого упоминания определи:
1. CONTEXT — один из типов:
   - PRIMARY_RECOMMENDATION: бренд назван лучшим/первым/топ-выбором или чётко рекомендован
   - COMPARISON: бренд включён в сравнительный список наравне с другими
   - ALTERNATIVE: бренд упомянут как второстепенный вариант («можно также рассмотреть»)
   - REFERENCE: нейтральное упоминание без явной оценки
   - WARNING: бренд упомянут с критикой или предостережением

2. QUALITY — число от 0 до 100 (насколько полезно это упоминание для бренда):
   PRIMARY_RECOMMENDATION → 75–100
   COMPARISON             → 45–70
   ALTERNATIVE            → 25–45
   REFERENCE              → 10–30
   WARNING                → 0–15

Отвечай ТОЛЬКО в формате JSON массива без пояснений:
[{"id":"<id>","context":"<TYPE>","quality":<число>}]`

interface ClassifyInput {
  id: string
  brand: string
  contextWindow: string
  query: string
}

async function classifyBatch(items: ClassifyInput[]): Promise<MentionClassification[]> {
  if (items.length === 0) return []

  const userMessage = items.map((item, i) =>
    `${i + 1}. ID: ${item.id}\nЗапрос: "${item.query}"\nКонтекст упоминания "${item.brand}":\n${item.contextWindow}`
  ).join("\n\n---\n\n")

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "[]"

    // Парсим JSON — Claude Haiku иногда оборачивает в ```json
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return fallbackClassifications(items)

    const parsed = JSON.parse(jsonMatch[0]) as { id: string; context: string; quality: number }[]

    return parsed.map((p) => {
      const ctx = (p.context ?? "REFERENCE") as MentionContext
      const validContexts: MentionContext[] = [
        "PRIMARY_RECOMMENDATION", "COMPARISON", "ALTERNATIVE", "REFERENCE", "WARNING"
      ]
      const safeCtx: MentionContext = validContexts.includes(ctx) ? ctx : "REFERENCE"
      const quality = Math.max(0, Math.min(100, Math.round(p.quality ?? BASE_QUALITY[safeCtx])))

      return {
        queryResultId: p.id,
        mentionContext: safeCtx,
        mentionQuality: quality,
        rationale: `Classified as ${safeCtx} with quality ${quality}`,
      }
    })
  } catch (err) {
    console.error("[semantic-analysis-agent] Classification error:", err)
    return fallbackClassifications(items)
  }
}

function fallbackClassifications(items: ClassifyInput[]): MentionClassification[] {
  return items.map((item) => ({
    queryResultId: item.id,
    mentionContext: "REFERENCE" as MentionContext,
    mentionQuality: BASE_QUALITY.REFERENCE,
    rationale: "Fallback classification (API error)",
  }))
}

// ── Основная функция ─────────────────────────────────────────────────────────

/**
 * Классифицирует упоминания бренда во всех QueryResult аудита.
 * Результаты сохраняются в БД: mentionContext + mentionQuality.
 *
 * @returns Сводная статистика по типам упоминаний
 */
export async function runSemanticAnalysisAgent(jobId: string): Promise<{
  total: number
  classified: number
  byContext: Record<MentionContext, number>
  avgQuality: number
}> {
  // Загружаем только упомянутые результаты
  const mentionedResults = await prisma.queryResult.findMany({
    where: { jobId, brandMentioned: true },
    select: { id: true, query: true, response: true },
  })

  const job = await prisma.auditJob.findUnique({
    where: { id: jobId },
    select: { companyName: true },
  })

  if (mentionedResults.length === 0 || !job) {
    return { total: 0, classified: 0, byContext: emptyByContext(), avgQuality: 0 }
  }

  const brand = job.companyName

  // Готовим входные данные
  const inputs: ClassifyInput[] = mentionedResults.map((r) => ({
    id: r.id,
    brand,
    contextWindow: extractContextWindow(r.response, brand),
    query: r.query,
  }))

  // Батчи по 10 — Haiku легко справится, но не перегружаем контекст
  const BATCH_SIZE = 10
  const allClassifications: MentionClassification[] = []

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE)
    const results = await classifyBatch(batch)
    allClassifications.push(...results)
  }

  // Сохраняем в БД
  await Promise.allSettled(
    allClassifications.map((c) =>
      prisma.queryResult.update({
        where: { id: c.queryResultId },
        data: {
          mentionContext: c.mentionContext,
          mentionQuality: c.mentionQuality,
        },
      })
    )
  )

  // Статистика
  const byContext = emptyByContext()
  let totalQuality = 0

  for (const c of allClassifications) {
    byContext[c.mentionContext] = (byContext[c.mentionContext] ?? 0) + 1
    totalQuality += c.mentionQuality
  }

  const avgQuality = allClassifications.length > 0
    ? Math.round(totalQuality / allClassifications.length)
    : 0

  console.log(`[semantic-agent] Classified ${allClassifications.length}/${mentionedResults.length} mentions for job ${jobId}. Avg quality: ${avgQuality}`)

  return {
    total: mentionedResults.length,
    classified: allClassifications.length,
    byContext,
    avgQuality,
  }
}

function emptyByContext(): Record<MentionContext, number> {
  return {
    PRIMARY_RECOMMENDATION: 0,
    COMPARISON: 0,
    ALTERNATIVE: 0,
    REFERENCE: 0,
    WARNING: 0,
  }
}

// ── Вспомогательная функция: метка для UI ────────────────────────────────────

export const MENTION_CONTEXT_LABELS: Record<MentionContext, { label: string; color: string; bg: string }> = {
  PRIMARY_RECOMMENDATION: { label: "Топ-рекомендация", color: "#166534", bg: "#dcfce7" },
  COMPARISON:             { label: "Сравнение",         color: "#1e40af", bg: "#dbeafe" },
  ALTERNATIVE:            { label: "Альтернатива",      color: "#854d0e", bg: "#fef9c3" },
  REFERENCE:              { label: "Упоминание",        color: "#374151", bg: "#f3f4f6" },
  WARNING:                { label: "Предостережение",   color: "#991b1b", bg: "#fee2e2" },
}
