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
        `[${r.platform}] Query: "${r.query}"\nMentioned: ${r.brandMentioned}, Sentiment: ${r.sentiment}, Competitors: ${r.competitors.join(", ") || "нет"}, Sources: ${(r.sources as string[]).length} URLs\nResponse excerpt: ${r.response.substring(0, 400)}...`
    )
    .join("\n\n")

  const totalMentioned = results.filter((r) => r.brandMentioned).length
  const mentionRate = Math.round((totalMentioned / Math.max(results.length, 1)) * 100)

  const systemContext = `Ты — старший аналитик по GEO (Generative Engine Optimization) 2026. Ты глубоко понимаешь, как работают RAG-системы в LLM: модели извлекают информацию из авторитетных источников, оценивают E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness), формируют Entity Graph и ранжируют бренды в ответах на основе их представленности в базе знаний.

Ключевые GEO-факторы видимости в 2026:
- **Entity Recognition**: насколько чётко ИИ идентифицирует бренд как отдельную сущность (наличие в Wikipedia, Wikidata, Google Knowledge Graph)
- **Source Authority**: на каких ресурсах упоминается бренд — профильные СМИ, каталоги, форумы, официальные справочники
- **Position in Answer**: упоминается ли бренд первым или в топе ранжированных списков (это означает, что ИИ считает его primary recommendation)
- **Citation Frequency**: как часто ИИ цитирует сайт бренда как источник информации (прямой сигнал авторитетности)
- **Answer Context**: бренд рекомендован как решение проблемы или просто упомянут в списке — принципиальная разница`

  const prompts: Record<AnalysisType, string> = {
    competitors: `${systemContext}

Проанализируй данные AI-аудита (${results.length} запросов, бренд упомянут в ${mentionRate}%) с точки зрения конкурентного GEO-позиционирования:

1. **Частота и платформы**: Какие конкуренты доминируют и на каких платформах? Есть ли платформы где конкурент явно лидирует?

2. **Position Gap**: В запросах типа "топ", "лучший", "рейтинг" — на каком месте в ответе ИИ упоминает конкурентов vs наш бренд? Если бренд вообще не упомянут в позиционных запросах — это критический GEO Authority Gap.

3. **Source Advantage**: На каких ресурсах (источниках) упоминаются конкуренты, которых нет у нас? Это их "невидимое преимущество" в RAG-системах.

4. **Нарратив конкурентов**: Какими словами и в каком контексте ИИ описывает конкурентов? Это ключевые сигналы их Entity Profile.

5. **Конкретные возможности**: 3-5 конкретных шагов для того, чтобы перехватить трафик у конкурентов в AI-поиске.

Данные аудита:\n${resultsSummary}`,

    sentiment: `${systemContext}

Проанализируй тональность и контекст упоминаний бренда в AI-ответах (${results.length} запросов):

1. **Контекст упоминания**: Когда бренд упоминается — как primary recommendation, в сравнении, вскользь в списке, или нейтрально? Это важнее самого факта упоминания.

2. **Триггеры позитивных упоминаний**: Какие типы запросов (рекомендательные, ценовые, проблемные) приводят к позитивному контексту? Это "контентные ниши" которые работают.

3. **Триггеры отсутствия/негатива**: В каких запросах бренд не упоминается вообще, хотя конкуренты есть? Это E-E-A-T gap — ИИ не считает бренд авторитетным источником по этой теме.

4. **Качество упоминаний**: Есть ли запросы где бренд упомянут, но в нейтральном контексте без рекомендации? Это "слабые упоминания" — хуже чем позитивные, но лучше чем отсутствие.

5. **Рекомендации по улучшению тональности**: Конкретные контентные и технические шаги для улучшения контекста упоминаний.

Данные аудита:\n${resultsSummary}`,

    gaps: `${systemContext}

Проанализируй пробелы в GEO-видимости бренда (${results.length} запросов, ${mentionRate}% mention rate):

1. **Topic Gaps**: Какие тематические категории запросов дают 0% упоминаний? Группируй по смыслу (ценовые, сравнительные, проблемные, рейтинговые).

2. **Platform Gaps**: На каких платформах видимость критически низкая (<10%)? Чем отличается аудитория этих платформ?

3. **Position Gaps**: В запросах с "топ", "лучший", "первый" — упоминается ли бренд вообще? Если нет — отсутствует в Entity Knowledge Base ИИ по этой категории.

4. **RAG Source Gaps**: Есть ли запросы, где ИИ ссылается на конкретные источники, но наш сайт не в их числе? Это прямо указывает на нужные публикации.

5. **Comparison Gaps**: В запросах "X vs Y" или "сравнение [ниша]" — включают ли ИИ-ответы наш бренд в сравнение? Если нет — нет comparison-контента.

6. **Конкретный план закрытия пробелов**: Для каждого типа gap — 1-2 конкретных действия с ожидаемым сроком эффекта.

Данные аудита:\n${resultsSummary}`,
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompts[analysisType] }],
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}
