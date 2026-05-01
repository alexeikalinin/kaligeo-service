import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "../prisma"

type AnalysisType = "competitors" | "sentiment" | "gaps"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runAnalysisAgent(jobId: string, analysisType: AnalysisType): Promise<string> {
  const results = await prisma.queryResult.findMany({
    where: { jobId },
    select: {
      platform: true,
      query: true,
      response: true,
      brandMentioned: true,
      competitors: true,
      sentiment: true,
      sources: true,
    },
  })

  if (results.length === 0) return "Нет данных для анализа."

  const resultsSummary = results
    .map(
      (r) =>
        `[${r.platform}] Query: "${r.query}"\nMentioned: ${r.brandMentioned}, Sentiment: ${r.sentiment}, Competitors: ${r.competitors.join(", ")}\nResponse excerpt: ${r.response.substring(0, 300)}...`
    )
    .join("\n\n")

  const prompts: Record<AnalysisType, string> = {
    competitors: `Проанализируй следующие результаты AI-аудита и дай детальный анализ конкурентного позиционирования:
- Какие конкуренты упоминаются чаще всего и на каких платформах?
- В каких контекстах AI рекомендует конкурентов вместо нашего бренда?
- Какие сильные стороны конкурентов выделяет AI?
- Где есть возможности для улучшения нашей видимости?

Данные:\n${resultsSummary}`,

    sentiment: `Проанализируй тональность упоминаний бренда в следующих данных AI-аудита:
- Как описывается бренд когда упоминается?
- Что вызывает позитивные/негативные/нейтральные упоминания?
- Есть ли паттерны в типах запросов где бренд упоминается хорошо?
- Рекомендации по улучшению тональности упоминаний.

Данные:\n${resultsSummary}`,

    gaps: `Проанализируй пробелы в видимости бренда:
- Какие типы запросов НЕ приводят к упоминанию бренда, хотя должны?
- На каких платформах самая низкая видимость и почему?
- Какие ниши и темы AI не ассоциирует с брендом?
- Конкретные действия для закрытия этих пробелов.

Данные:\n${resultsSummary}`,
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompts[analysisType] }],
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}
