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

ФОРМАТЫ КОНТЕНТА, КОТОРЫЕ AI ЦИТИРУЕТ ОХОТНЕЕ ВСЕГО (применяй в contentBriefs, faqStructure и geoOptimizationBriefs):
1. Standalone definition — «[Бренд] — это [25-50 слов: год основания, категория, ключевое отличие].» — именно этот формат AI берёт в knowledge panels и Entity Graph
2. Quotable statement — «[Должность] [Имя] утверждает: "[1-3 предложения + конкретная цифра]." ([источник, год])» — Perplexity-ready цитата с атрибуцией
3. FAQ answer budget — ответ на FAQ-вопрос ≤60 слов → AI цитирует дословно; более длинные ответы AI переформулирует и теряет атрибуцию бренда
4. Disambiguation note — если бренд может путаться с другим: «[Бренд] (не путать с [похожее]) — это...» — устраняет «confused» статус в AI
5. "Ответ сначала" принцип — ключевой тезис в первом предложении абзаца, затем контекст — AI берёт первое предложение как цитату
6. Specificity rule — заменяй «многие клиенты» на «83% клиентов (n=1 200, опрос 2025)» — AI предпочитает верифицируемые, датированные утверждения

Правила:
- blogTopics: 5-7 тем, фокус на вопросах которые задают ChatGPT/Perplexity (формат "Лучший...", "Как выбрать...", "Топ...")
- faqStructure: 5-8 FAQ с конкретными ответами которые AI будет цитировать — формат Question + Answer-outline
- schemaSuggestions: 4-5 типов Schema.org (Organization, FAQPage, Product, LocalBusiness, Review, **Speakable** — специально для голосовых ассистентов: указывает Алисе и другим голосовым AI какие фрагменты зачитывать) — конкретно для этой ниши
- contentBriefs: 3-5 материалов под конкретные пробелы аудита (лонгрид/кейс/сравнение/рейтинг). Каждый материал должен иметь FAQ-блок с ответами ≤60 слов — такой формат AI цитирует дословно.
- geoOptimizationBriefs: 3-4 материала специально под GEO — страницы, которые попадут в "топ" и "лучший" запросы
- entitySignalRecommendations: 5-7 конкретных действий для усиления Entity Graph, ОБЯЗАТЕЛЬНО включая:
  * llms.txt в корне сайта (новый стандарт 2025: разрешения для AI-краулеров, аналог robots.txt для LLM — указать Allow: /blog, /faq, /about)
  * Яндекс Бизнес / business.yandex.ru (критично для Алисы — primary source голосовых рекомендаций)
  * Яндекс Справочник и 2GIS (для Алисы и локального AI-поиска)
  * + остальные внешние площадки (Wikipedia, Wikidata, профильные каталоги)
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
