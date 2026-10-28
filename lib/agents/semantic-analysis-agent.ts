/**
 * Semantic Analysis Agent — Волна 3
 *
 * Для каждого QueryResult, где brandMentioned = true, классифицирует
 * контекст упоминания бренда и присваивает quality score 0–100.
 *
 * Использует Gemini Flash-Lite (дёшево, быстро, достаточно для классификации).
 * Запускается в ADVANCED / MONITOR_AGENT пайплайне параллельно с другими агентами.
 */

import { generateText } from "ai"
import { getLightweightModel } from "../models"
import { prisma } from "../prisma"
import type { MentionContext, MentionClassification } from "./semantic-analysis-types"

// Re-export типы и константы для обратной совместимости.
// Client Components должны импортировать напрямую из semantic-analysis-types
// чтобы не тянуть pg/prisma в браузерный бандл.
export type { MentionContext, MentionClassification } from "./semantic-analysis-types"
export { MENTION_CONTEXT_LABELS } from "./semantic-analysis-types"


// ── Извлечь контекстное окно вокруг упоминания ─────────────────────────────

function extractContextWindow(text: string, brand: string, windowSize = 400): string {
  const idx = text.toLowerCase().indexOf(brand.toLowerCase())
  if (idx === -1) return text.slice(0, windowSize)
  const start = Math.max(0, idx - windowSize / 2)
  const end = Math.min(text.length, idx + windowSize / 2)
  return (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "")
}

// ── Батч-классификация через Gemini Flash-Lite ────────────────────────────────────

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
    const response = await generateText({
      model: getLightweightModel(),
      maxRetries: 0,
      maxOutputTokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    })

    const text = response.text.trim()

    // Парсим JSON — Gemini Flash-Lite иногда оборачивает в ```json
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) throw new Error("Classification response contains no JSON array")

    const parsed = JSON.parse(jsonMatch[0]) as { id: string; context: string; quality: number }[]

    const expected = new Set(items.map(item => item.id))
    if (parsed.length !== expected.size || new Set(parsed.map(p => p.id)).size !== expected.size) {
      throw new Error("Classification response has missing or duplicate IDs")
    }
    return parsed.map((p) => {
      const validContexts: MentionContext[] = ["PRIMARY_RECOMMENDATION", "COMPARISON", "ALTERNATIVE", "REFERENCE", "WARNING"]
      if (!expected.has(p.id) || !validContexts.includes(p.context as MentionContext)
        || !Number.isFinite(p.quality) || p.quality < 0 || p.quality > 100) {
        throw new Error("Invalid classification: ID, context or quality")
      }
      return {
        queryResultId: p.id,
        mentionContext: p.context as MentionContext,
        mentionQuality: Math.round(p.quality),
        rationale: `Classified as ${p.context} with quality ${p.quality}`,
      }
    })
  } catch (err) {
    throw new Error(`Semantic classification failed: ${err instanceof Error ? err.message : "unknown error"}`, { cause: err })
  }
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

  // Батчи по 10 — ограничиваем размер запроса, но не перегружаем контекст
  const BATCH_SIZE = 10
  const allClassifications: MentionClassification[] = []

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE)
    const results = await classifyBatch(batch)
    allClassifications.push(...results)
  }

  // Сохраняем в БД
  await Promise.all(
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
