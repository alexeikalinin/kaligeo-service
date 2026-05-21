import Anthropic from "@anthropic-ai/sdk"

export interface ContentRecommendations {
  blogTopics: { title: string; angle: string; keywords: string[] }[]
  faqStructure: { question: string; answerOutline: string }[]
  schemaSuggestions: { type: string; description: string }[]
  contentBriefs: { title: string; goal: string; format: string }[]
  // GEO-специфичные поля (добавлены в 2026):
  geoOptimizationBriefs?: { title: string; geoTarget: string; queryTriggers: string[]; format: string }[]
  entitySignalRecommendations?: { action: string; platform: string; impact: string }[]
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runContentAgent(params: {
  companyName: string
  niche: string
  weakPoints: string[]
  competitorStrengths: string[]
}): Promise<ContentRecommendations> {
  const { companyName, niche, weakPoints, competitorStrengths } = params

  const prompt = `Ты — эксперт по GEO-контент-маркетингу (Generative Engine Optimization) 2026. Твоя задача — создать контент, который попадёт в ответы ChatGPT, Perplexity, Gemini, Claude и Яндекс Алисы как авторитетный источник.

Компания: ${companyName}
Ниша: ${niche}

Слабые места из AI-аудита (что ИИ не ассоциирует с брендом):
${weakPoints.map((w) => `- ${w}`).join("\n")}

Сильные стороны конкурентов (откуда их цитируют):
${competitorStrengths.map((s) => `- ${s}`).join("\n")}

Создай конкретные GEO-контентные рекомендации. Верни JSON строго в формате:
{
  "blogTopics": [{"title": "...", "angle": "...", "keywords": ["..."]}],
  "faqStructure": [{"question": "...", "answerOutline": "..."}],
  "schemaSuggestions": [{"type": "...", "description": "..."}],
  "contentBriefs": [{"title": "...", "goal": "...", "format": "..."}],
  "geoOptimizationBriefs": [
    {
      "title": "Название материала",
      "geoTarget": "Под какой тип запроса оптимизируем (position/comparison/recommendation/rag)",
      "queryTriggers": ["топ-5 [ниша]", "лучший [услуга]"],
      "format": "Лонгрид / Сравнение / FAQ-страница / Рейтинг"
    }
  ],
  "entitySignalRecommendations": [
    {
      "action": "Конкретное действие (например: Создать карточку компании на Wikidata)",
      "platform": "Wikidata / Wikipedia / Google Business / Яндекс.Справочник / отраслевой портал",
      "impact": "Как это улучшит Entity Recognition в LLM через 1-3 месяца"
    }
  ]
}

Правила:
- blogTopics: 5-7 тем, фокус на вопросах которые задают ChatGPT/Perplexity (формат "Лучший...", "Как выбрать...", "Топ...")
- faqStructure: 5-8 FAQ с конкретными ответами которые AI будет цитировать — формат Question + Answer-outline
- schemaSuggestions: 3-4 типа Schema.org (Organization, FAQPage, Product, LocalBusiness, Review) — конкретно для этой ниши
- contentBriefs: 3-5 материалов под конкретные пробелы аудита (лонгрид/кейс/сравнение/рейтинг)
- geoOptimizationBriefs: 3-4 материала специально под GEO — страницы, которые попадут в "топ" и "лучший" запросы
- entitySignalRecommendations: 4-6 конкретных размещений на внешних платформах для усиления Entity Graph
- Всё на русском языке, конкретно для ниши "${niche}"`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Failed to parse content recommendations JSON")

  return JSON.parse(jsonMatch[0]) as ContentRecommendations
}
