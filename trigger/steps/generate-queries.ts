import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getQueryCountForTier, type Tier } from "../../lib/gates"
import { QUERY_GEN_MODEL } from "../../lib/models"
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

/** Строит промпт генерации GEO-запросов. Вынесено отдельно, чтобы один и тот же
 * промпт можно было прогнать через разные AI-клиенты для сравнения (см.
 * app/api/admin/query-gen-test), не дублируя шаблон. */
export function buildQueryGenPrompt(
  companyName: string,
  niche: string,
  competitors: string[],
  aiCount: number,
  siteContext?: SiteContext,
  optimizerHints?: QueryOptimizationHints
): string {
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

ВАЖНО — распредели запросы по 7 категориям НАМЕРЕНИЙ. Ниже для каждой категории описано, ЧТО ищет пользователь и ЗАЧЕМ — придумай формулировку сам, исходя из реальной ниши и деталей сайта выше. Не копируй синтаксис или порядок слов иллюстративных примеров (они взяты из другой ниши специально, чтобы их нельзя было скопировать) — если два запроса из разных категорий или разных вопросов легко превращаются один в другой заменой пары слов, это ошибка, переформулируй.

1. **recommendation** (~${otherCategoriesCount} запросов) — пользователь в конкретной жизненной/бизнес-ситуации просит совет, что выбрать. Пример стиля из другой ниши: «Ищу студию для монтажа свадебного видео, бюджет ограничен — на что смотреть?»

2. **position** (~${otherCategoriesCount} запросов) — пользователь хочет список лидеров/рейтинг рынка, не называя конкретных игроков сам. Пример стиля: «Кто сейчас считается лучшим в доставке цветов по СПб?»

3. **comparison** (ровно ${comparisonCount} запросов, НЕ больше) — сравнение игроков рынка.
   Из них максимум ${namedComparisonCount} могут прямо называть конкурентов по имени (например «${competitors[0] ?? "[компания1]"} или ${competitors[1] ?? "[компания2]"} — что лучше?») — такой формат структурно исключает бренд с низкой узнаваемостью, поэтому используй его экономно.
   Остальные — обобщённое сравнение игроков рынка без явных имён, но с конкретным критерием сравнения (цена, скорость, качество, гарантии — выбери релевантный для этой ниши).

4. **conversational** (~${otherCategoriesCount} запросов) — развёрнутый разговорный вопрос с личным контекстом говорящего (кто он, в какой ситуации), в стиле голосового ассистента. Пример стиля: «Я переезжаю в новый район, посоветуй куда обращаться за интернетом, у меня частный дом».

5. **rag** (~${otherCategoriesCount} запросов) — пользователь явно просит источники, отзывы или ссылки на проверенную информацию, а не готовый ответ. Пример стиля: «Скинь ссылки, где почитать независимые обзоры кофемашин перед покупкой».

6. **price** (~${otherCategoriesCount} запросов) — вопрос о стоимости, бюджете или структуре цены применительно к конкретной задаче пользователя в этой нише, не абстрактный "сколько стоит X".

7. **problem** (~${otherCategoriesCount} запросов) — у пользователя уже есть конкретная проблема/боль в этой нише и он ищет решение, а не общую информацию.

Дополнительные требования:
- 70% запросов на русском, 30% на английском (английские — для ChatGPT, Claude, Perplexity)
- Каждый запрос — короткая фраза или одно предложение, максимум 16 слов. Это не эссе, это то, что человек реально печатает в чат за 5 секунд. Экономия токенов важна: короче формулировка — дешевле обходится запуск на 6+ AI-платформах.
- Запросы — естественная разговорная речь, не SEO-ключи
- НЕ генерируй запросы про саму компанию «${companyName}» — только про нишу в целом
- Внутри каждой категории и между категориями запросы должны различаться грамматической конструкцией (не все начинаются с глагола в повелительном наклонении, не все — вопросом "Какой/Какая")
- Каждый запрос должен быть уникальным и реалистичным
- Используй конкретные детали ниши и то, чем реально занимается компания (см. блок выше), а не абстрактные шаблоны — если ниша заявлена неточно, ориентируйся на реальное описание сайта

Верни JSON-объект с единственным полем "queries" — массив строк (без меток категорий в тексте):
{"queries": ["запрос 1", "запрос 2", ...]}`

  return prompt
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

  const prompt = buildQueryGenPrompt(companyName, niche, competitors, aiCount, siteContext, optimizerHints)

  let aiQueries: string[]
  try {
    const response = await getClient().chat.completions.create({
      model: QUERY_GEN_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 1.1,
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
