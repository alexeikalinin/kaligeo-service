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

  // Risk gate: data_insufficient — предупреждаем агента при нехватке данных
  const allNoMentions = results.every((r) => !r.brandMentioned)
  const dataGateWarning = results.length < 5 || allNoMentions
    ? `\n⚠️ ВНИМАНИЕ (data_insufficient): данных мало (${results.length} запросов, упоминаний: ${results.filter(r => r.brandMentioned).length}). Если для какого-либо вывода не хватает данных — явно напиши INSUFFICIENT_DATA:[причина] вместо домысла. Делай выводы только на основе реальных данных.\n`
    : ""

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
${dataGateWarning}
Проанализируй данные AI-аудита (${results.length} запросов, бренд упомянут в ${mentionRate}%) с точки зрения конкурентного GEO-позиционирования:

1. **Частота и платформы**: Какие конкуренты доминируют и на каких платформах? Есть ли платформы где конкурент явно лидирует?

2. **Position Gap**: В запросах типа "топ", "лучший", "рейтинг" — на каком месте в ответе ИИ упоминает конкурентов vs наш бренд? Если бренд вообще не упомянут в позиционных запросах — это критический GEO Authority Gap.

3. **Source Advantage**: На каких ресурсах (источниках) упоминаются конкуренты, которых нет у нас? Это их "невидимое преимущество" в RAG-системах.

4. **Нарратив конкурентов**: Какими словами и в каком контексте ИИ описывает конкурентов? Это ключевые сигналы их Entity Profile.

5. **Конкретные возможности**: 3-5 конкретных шагов для того, чтобы перехватить трафик у конкурентов в AI-поиске.

Данные аудита:\n${resultsSummary}`,

    sentiment: `${systemContext}
${dataGateWarning}
Проанализируй тональность и контекст упоминаний бренда в AI-ответах (${results.length} запросов):

1. **Контекст упоминания**: Когда бренд упоминается — как primary recommendation, в сравнении, вскользь в списке, или нейтрально? Это важнее самого факта упоминания.

2. **Триггеры позитивных упоминаний**: Какие типы запросов (рекомендательные, ценовые, проблемные) приводят к позитивному контексту? Это "контентные ниши" которые работают.

3. **Триггеры отсутствия/негатива**: В каких запросах бренд не упоминается вообще, хотя конкуренты есть? Это E-E-A-T gap — ИИ не считает бренд авторитетным источником по этой теме.

4. **Качество упоминаний**: Есть ли запросы где бренд упомянут, но в нейтральном контексте без рекомендации? Это "слабые упоминания" — хуже чем позитивные, но лучше чем отсутствие.

5. **Рекомендации по улучшению тональности**: Конкретные контентные и технические шаги для улучшения контекста упоминаний.

Данные аудита:\n${resultsSummary}`,

    gaps: `${systemContext}
${dataGateWarning}
Проанализируй пробелы в GEO-видимости бренда (${results.length} запросов, ${mentionRate}% mention rate).

## Фреймворк 5 типов запросов (из лучших практик GEO-аудита)

Профессиональный GEO-аудит проверяет 5 типов запросов. Оцени покрытие и результаты по каждому:

**Тип 1 — Категорийные** ("лучший X", "топ сервисов Y", "рейтинг компаний"): попадает ли бренд в списки?
**Тип 2 — Коммерческие** ("цена", "купить", "заказать", "тариф"): есть ли бренд в коммерческих рекомендациях?
**Тип 3 — Проблемные** ("как сделать X", "решение проблемы Y"): называет ли ИИ бренд как решение?
**Тип 4 — Сравнительные** ("X vs Y", "сравнение", "что лучше"): включён ли бренд в сравнения?
**Тип 5 — Брендовые** (прямые запросы с названием бренда): что ИИ отвечает на прямые вопросы о компании?

## Анализ пробелов

1. **Query Type Gaps**: По каким из 5 типов бренд НЕ упоминается? Это приоритетные контентные пробелы.

2. **Platform Gaps**: На каких платформах видимость критически низкая (<10%)? Для Алисы — особое внимание: причина может быть в Яндекс Бизнес (Справочник), отзывах на Яндекс Картах или блокировке YandexAdditionalBot.

3. **Position Gaps**: В категорийных и коммерческих запросах — на каком месте в ответе упоминается бренд? Отсутствие в топ-3 позиции = нет в Entity Knowledge Base ИИ.

4. **RAG Source Gaps**: Есть ли запросы, где ИИ цитирует конкретные источники, но наш сайт не в их числе? Это прямо указывает на нужные публикации.

5. **Comparison Gaps**: В запросах "X vs Y" или "сравнение [ниша]" — включают ли ИИ-ответы наш бренд? Если нет — нужны Comparison-страницы.

6. **Context Quality Gaps**: Когда бренд упоминается — это primary recommendation (рекомендован первым) или просто упоминание в списке? Нейтральное упоминание лучше отсутствия, но хуже первого места в 3–5 раз.

7. **Конкретный план закрытия пробелов**: Для каждого типа gap — 1-2 конкретных действия с ожидаемым сроком эффекта (отдельно для Алисы если есть Алиса-специфичные пробелы).

Данные аудита:\n${resultsSummary}`,
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompts[analysisType] }],
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}
