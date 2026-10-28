import { EVIDENCE_RULES } from "../analysis/query-methodology"
import { generateText, Output } from "ai"
import { z } from "zod"
import { getAdvancedAnalysisModel } from "../models"

export interface ContentRecommendations {
  blogTopics: { title: string; angle: string; keywords: string[] }[]
  faqStructure: { question: string; answerOutline: string }[]
  schemaSuggestions: { type: string; description: string }[]
  contentBriefs: { title: string; goal: string; format: string }[]
  // GEO-специфичные поля (добавлены в 2026):
  geoOptimizationBriefs?: { title: string; geoTarget: string; queryTriggers: string[]; format: string }[]
  entitySignalRecommendations?: { action: string; platform: string; impact: string }[]
}


export async function runContentAgent(params: {
  verifiedEvidence?: unknown
  companyName: string
  niche: string
  weakPoints: string[]
  competitorStrengths: string[]
}): Promise<ContentRecommendations> {
  const { companyName, niche, weakPoints, competitorStrengths } = params

  const prompt = `${EVIDENCE_RULES}
Проверки сайта: ${JSON.stringify(params.verifiedEvidence ?? "Не проверено")}. Не предлагай создать уже найденную статью Wikipedia.
Ты — эксперт по GEO-контент-маркетингу (Generative Engine Optimization) 2026. Твоя задача — создать контент, который попадёт в ответы ChatGPT, Perplexity, Gemini, Claude и Яндекс Алисы как авторитетный источник.

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
      "impact": "Ожидаемый эффект как гипотеза и способ его проверки"
    }
  ]
}

Рекомендации по ясности контента — гипотезы для проверки, без гарантии цитирования:
- Краткое определение бренда, ответ в начале раздела, понятные FAQ и ссылки на источники.
- Цитаты людей, статистика, даты и цифры — только из предоставленных проверяемых фактов. При отсутствии данных предложи собрать их; не выдумывай пример как факт.
- Не обещай дословное цитирование, попадание в топ или фиксированный срок эффекта.

Правила:
- blogTopics: 5-7 тем по реальным вопросам выборки и подтвержденным продуктам компании.
- faqStructure: 5-8 FAQ; answerOutline — план ответа, а не выдуманные факты.
- schemaSuggestions: только применимые типы Schema.org. Если разметка уже обнаружена, рекомендуй проверить полноту, а не объявляй её отсутствующей. Не требуй LocalBusiness у нелокального бизнеса или Review без реальных отзывов.
- contentBriefs: 3-5 материалов под конкретные пробелы ответов с указанием проверяемой цели.
- geoOptimizationBriefs: 3-4 материала под релевантные запросы; эффект проверяется следующими измерениями.
- entitySignalRecommendations: только релевантные площадки. Непроверенное наличие профиля требует сначала проверки. Wikipedia/Wikidata зависят от правил значимости площадки, не гарантируй публикацию.
- llms.txt не является разрешением на обход сайта и не заменяет robots.txt; не включай его как обязательное исправление. Не утверждай поддержку Speakable конкретным ассистентом без источника.
- Всё на русском языке, конкретно для ниши "${niche}"`

  const { output } = await generateText({ maxRetries: 0,
    model: getAdvancedAnalysisModel(), prompt, maxOutputTokens: 10000,
    output: Output.object({ schema: z.object({
      blogTopics: z.array(z.object({ title: z.string(), angle: z.string(), keywords: z.array(z.string()) })),
      faqStructure: z.array(z.object({ question: z.string(), answerOutline: z.string() })),
      schemaSuggestions: z.array(z.object({ type: z.string(), description: z.string() })),
      contentBriefs: z.array(z.object({ title: z.string(), goal: z.string(), format: z.string() })),
      geoOptimizationBriefs: z.array(z.object({ title: z.string(), geoTarget: z.string(), queryTriggers: z.array(z.string()), format: z.string() })),
      entitySignalRecommendations: z.array(z.object({ action: z.string(), platform: z.string(), impact: z.string() })),
    }) }),
  })
  return output
}
