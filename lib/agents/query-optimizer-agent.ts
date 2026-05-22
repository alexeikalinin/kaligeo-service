/**
 * query-optimizer-agent — улучшает генерацию запросов на основе истории аудитов.
 *
 * Анализирует прошлые QueryResult в той же нише:
 * - какие запросы давали brand mention (успешные шаблоны)
 * - какие никогда не давали упоминания (неэффективные паттерны)
 * - какие типы запросов работают лучше для данной ниши
 *
 * Возвращает QueryOptimizationHints — вставляется в prompt generateQueries
 * для улучшения качества следующего аудита.
 *
 * Вызывается из:
 * - trigger/steps/generate-queries.ts (опционально, перед генерацией)
 * - orchestrator (через invoke_query_optimizer_agent)
 */

import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { prisma } from "../prisma"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface QueryPattern {
  template: string        // обобщённый шаблон запроса
  mentionRate: number     // 0–1, доля запросов этого типа давших brand mention
  exampleQuery: string    // конкретный пример из истории
  category: string        // recommendation/position/comparison/etc.
}

export interface QueryOptimizationHints {
  niche: string
  samplesAnalyzed: number        // кол-во QueryResult проанализировано
  effectivePatterns: QueryPattern[]  // паттерны с mentionRate > 0.3
  ineffectivePatterns: QueryPattern[] // паттерны с mentionRate < 0.1
  nichInsights: string           // AI-обобщение специфики ниши для запросов
  recommendedFocus: string[]     // на что делать акцент в этой нише
  avoidPatterns: string[]        // что не работает в этой нише
}

export async function runQueryOptimizerAgent(
  niche: string,
  companyName: string
): Promise<QueryOptimizationHints> {
  // Находим прошлые аудиты в похожей нише (нечёткий поиск по подстроке)
  const nicheKeyword = niche.split(/[\s,]/)[0].toLowerCase()

  const pastJobs = await prisma.auditJob.findMany({
    where: {
      niche: { contains: nicheKeyword, mode: "insensitive" },
      companyName: { not: companyName },  // исключаем текущую компанию
      status: "COMPLETED",
    },
    select: { id: true },
    take: 10,
    orderBy: { completedAt: "desc" },
  })

  if (pastJobs.length === 0) {
    // Нет истории — возвращаем пустые хинты без LLM-вызова
    return {
      niche,
      samplesAnalyzed: 0,
      effectivePatterns: [],
      ineffectivePatterns: [],
      nichInsights: "Нет исторических данных по данной нише. Используется стандартная генерация.",
      recommendedFocus: [],
      avoidPatterns: [],
    }
  }

  const jobIds = pastJobs.map((j) => j.id)

  const results = await prisma.queryResult.findMany({
    where: { jobId: { in: jobIds } },
    select: {
      query: true,
      brandMentioned: true,
      sentiment: true,
      positionScore: true,
    },
    take: 200,
  })

  if (results.length === 0) {
    return {
      niche,
      samplesAnalyzed: 0,
      effectivePatterns: [],
      ineffectivePatterns: [],
      nichInsights: "Нет данных запросов в истории.",
      recommendedFocus: [],
      avoidPatterns: [],
    }
  }

  // Разбиваем на успешные/неуспешные для анализа
  const successful = results.filter((r) => r.brandMentioned)
  const failed = results.filter((r) => !r.brandMentioned)

  const sampleSuccessful = successful.slice(0, 30).map((r) => r.query)
  const sampleFailed = failed.slice(0, 20).map((r) => r.query)

  const prompt = `Ты анализируешь историю AI-аудитов видимости брендов в нише "${niche}".

Запросы, которые ДАВАЛИ упоминание бренда (${successful.length} из ${results.length}):
${sampleSuccessful.map((q) => `- ${q}`).join("\n")}

Запросы, которые НЕ давали упоминания:
${sampleFailed.slice(0, 15).map((q) => `- ${q}`).join("\n")}

Проанализируй паттерны и ответь строго JSON без markdown:
{
  "effectivePatterns": [
    {"template": "шаблон", "mentionRate": 0.7, "exampleQuery": "пример", "category": "recommendation|position|comparison|conversational|rag|price|problem"},
    ...до 5
  ],
  "ineffectivePatterns": [
    {"template": "шаблон", "mentionRate": 0.05, "exampleQuery": "пример", "category": "..."},
    ...до 3
  ],
  "nichInsights": "2-3 предложения о специфике запросов в этой нише",
  "recommendedFocus": ["на что делать акцент 1", "2", "3"],
  "avoidPatterns": ["что не работает 1", "2"]
}`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    temperature: 0.3,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    // LLM не вернул JSON — возвращаем базовые хинты
    return {
      niche,
      samplesAnalyzed: results.length,
      effectivePatterns: [],
      ineffectivePatterns: [],
      nichInsights: "Не удалось проанализировать паттерны.",
      recommendedFocus: [],
      avoidPatterns: [],
    }
  }

  const parsed = JSON.parse(jsonMatch[0])

  return {
    niche,
    samplesAnalyzed: results.length,
    effectivePatterns: parsed.effectivePatterns ?? [],
    ineffectivePatterns: parsed.ineffectivePatterns ?? [],
    nichInsights: parsed.nichInsights ?? "",
    recommendedFocus: parsed.recommendedFocus ?? [],
    avoidPatterns: parsed.avoidPatterns ?? [],
  }
}
