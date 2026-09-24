import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getQueryCountForTier, type Tier } from "../../lib/gates"
import type { QueryOptimizationHints } from "../../lib/agents/query-optimizer-agent"

export interface SiteContext {
  description: string
  services: string[]
  targetAudience: string
}

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

async function generateWithGemini(prompt: string): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "")
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
  const result = await model.generateContent(
    prompt + '\n\nВерни ТОЛЬКО валидный JSON объект {"queries": [...]} без markdown-блоков.'
  )
  const text = result.response.text().trim()
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const parsed = JSON.parse(cleaned)
  return Array.isArray(parsed) ? parsed : (parsed.queries ?? [])
}

export async function generateQueries(
  companyName: string,
  niche: string,
  competitors: string[],
  tier: "BASIC" | "STANDARD" | "ADVANCED",
  customPrompts: string[] = [],
  siteContext?: SiteContext,
  optimizerHints?: QueryOptimizationHints
): Promise<string[]> {
  const count = getQueryCountForTier(tier as Tier)

  // Reserve slots for custom prompts (max 20% of total, capped at 10)
  const customEnabled = customPrompts.filter(Boolean).slice(0, Math.min(10, Math.floor(count * 0.2)))
  const aiCount = count - customEnabled.length

  const competitorsList = competitors.length > 0 ? competitors.join(", ") : "нет данных"

  // comparison — самая рискованная категория: прямое «X или Y» гарантированно
  // проигрывает бренду с низким entity recognition (модель просто не назовёт
  // неизвестный ей бренд). Держим её маленькой и большей частью без явных имён.
  const comparisonCount = Math.max(1, Math.round(aiCount * 0.1))
  const namedComparisonCount = Math.min(2, comparisonCount)
  const remainingCount = aiCount - comparisonCount
  const otherCategoriesCount = Math.round(remainingCount / 6)

  const siteContextBlock = siteContext
    ? `\nЧто реально делает компания (по анализу сайта, используй это как основной источник истины о нише — если он расходится со строкой "Ниша / отрасль" выше, доверяй этому блоку):
Описание: ${siteContext.description}
Услуги/продукты: ${siteContext.services.join(", ") || "не определены"}
Целевая аудитория: ${siteContext.targetAudience || "не определена"}\n`
    : ""

  const optimizerBlock = optimizerHints && optimizerHints.samplesAnalyzed > 0
    ? `\nИсторические данные по похожей нише (${optimizerHints.samplesAnalyzed} прошлых запросов проанализировано):
${optimizerHints.nichInsights}
Формулировки, которые РЕАЛЬНО давали упоминание бренда — используй похожие паттерны:
${optimizerHints.effectivePatterns.map((p) => `- ${p.template} (пример: «${p.exampleQuery}», mention rate ${Math.round(p.mentionRate * 100)}%)`).join("\n") || "нет данных"}
Формулировки, которые НИКОГДА не давали упоминание — избегай их:
${optimizerHints.ineffectivePatterns.map((p) => `- ${p.template} (пример: «${p.exampleQuery}»)`).join("\n") || "нет данных"}
${optimizerHints.avoidPatterns.length > 0 ? `Дополнительно избегай: ${optimizerHints.avoidPatterns.join("; ")}` : ""}\n`
    : ""

  const prompt = `Ты — эксперт по GEO (Generative Engine Optimization) и составляешь поисковые запросы для AI-аудита видимости бренда в 2026 году.

Компания: ${companyName}
Ниша / отрасль: ${niche}
Конкуренты: ${competitorsList}
${siteContextBlock}${optimizerBlock}
Сгенерируй ровно ${aiCount} запросов, которые потенциальный клиент реалистично напишет в ChatGPT, Perplexity, YandexGPT, Claude или Gemini, когда ищет товар/услугу в данной нише.

ВАЖНО — распредели запросы по 7 категориям:

1. **recommendation** (~${otherCategoriesCount} запросов) — запросы на рекомендацию:
   «Посоветуй [услугу] для [ситуации]», «Какую [нишу] выбрать для малого бизнеса?», «Что лучше использовать для [задача]?»

2. **position** (~${otherCategoriesCount} запросов) — запросы на рейтинги и топы (ключевые для отслеживания позиции бренда в ответе):
   «Топ-5 [ниша] в России 2026», «Лучшие [услуга] — рейтинг», «Назови трёх лидеров рынка [ниша]», «Какие компании [ниша] самые надёжные?»

3. **comparison** (ровно ${comparisonCount} запросов, НЕ больше) — сравнение с конкурентами:
   Из них максимум ${namedComparisonCount} могут прямо называть конкурентов по имени (например «${competitors[0] ?? "[компания1]"} или ${competitors[1] ?? "[компания2]"} — что лучше?») — такой формат структурно исключает бренд с низкой узнаваемостью, поэтому используй его экономно.
   Остальные — обобщённые сравнения без явных имён: «Сравни [ниша] по цене и качеству», «Чем отличаются топовые игроки рынка [ниша]?», «На что смотреть при выборе [услуги] среди конкурентов?»

4. **conversational** (~${otherCategoriesCount} запросов) — диалоговые вопросы (стиль Perplexity, Алиса):
   «Помоги выбрать [услугу], я [описание ситуации]», «Объясни разницу между [вариант А] и [вариант Б] в [нише]», «Я новичок в [ниша], с чего начать?»

5. **rag** (~${otherCategoriesCount} запросов) — запросы с явным запросом источников (активируют RAG-цитирование):
   «Посоветуй [услугу] со ссылками на проверенные источники», «Где прочитать честные отзывы о [ниша]?», «Какие авторитетные ресурсы про [нишу] существуют?»

6. **price** (~${otherCategoriesCount} запросов) — ценовые запросы:
   «Сколько стоит [услуга]?», «Средняя цена [ниша] в 2026», «Какой бюджет нужен для [задача]?»

7. **problem** (~${otherCategoriesCount} запросов) — запросы про боль / проблему:
   «Как решить [конкретная проблема в нише]?», «Что делать если [типичная ошибка]?», «Почему [нишевая проблема] возникает и как избежать?»

Дополнительные требования:
- 70% запросов на русском, 30% на английском (английские — для ChatGPT, Claude, Perplexity)
- Запросы — естественная разговорная речь, не SEO-ключи
- НЕ генерируй запросы про саму компанию «${companyName}» — только про нишу в целом
- Каждый запрос должен быть уникальным и реалистичным
- Используй конкретные детали ниши и то, чем реально занимается компания (см. блок выше), а не абстрактные шаблоны — если ниша заявлена неточно, ориентируйся на реальное описание сайта

Верни JSON-объект с единственным полем "queries" — массив строк (без меток категорий в тексте):
{"queries": ["запрос 1", "запрос 2", ...]}`

  let aiQueries: string[]
  try {
    const response = await getClient().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    })
    const text = response.choices[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(text)
    aiQueries = Array.isArray(parsed) ? parsed : (parsed.queries ?? [])
  } catch (openaiErr) {
    console.warn("OpenAI generateQueries failed, falling back to Gemini:", openaiErr)
    aiQueries = await generateWithGemini(prompt)
  }

  // Merge: custom prompts first (they're the client's priority), then AI-generated
  const merged = [...customEnabled, ...aiQueries].slice(0, count)
  return merged
}
