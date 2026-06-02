import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { getQueryCountForTier, type Tier } from "../../lib/gates"

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

async function generateWithGemini(prompt: string): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "")
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
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
  customPrompts: string[] = []
): Promise<string[]> {
  const count = getQueryCountForTier(tier as Tier)

  // Reserve slots for custom prompts (max 20% of total, capped at 10)
  const customEnabled = customPrompts.filter(Boolean).slice(0, Math.min(10, Math.floor(count * 0.2)))
  const aiCount = count - customEnabled.length

  const competitorsList = competitors.length > 0 ? competitors.join(", ") : "нет данных"

  const prompt = `Ты — эксперт по GEO (Generative Engine Optimization) и составляешь поисковые запросы для AI-аудита видимости бренда в 2026 году.

Компания: ${companyName}
Ниша / отрасль: ${niche}
Конкуренты: ${competitorsList}

Сгенерируй ровно ${aiCount} запросов, которые потенциальный клиент реалистично напишет в ChatGPT, Perplexity, YandexGPT, Claude или Gemini, когда ищет товар/услугу в данной нише.

ВАЖНО — распредели запросы равномерно по 7 категориям (по ~${Math.round(aiCount / 7)} запросов каждой):

1. **recommendation** — запросы на рекомендацию:
   «Посоветуй [услугу] для [ситуации]», «Какую [нишу] выбрать для малого бизнеса?», «Что лучше использовать для [задача]?»

2. **position** — запросы на рейтинги и топы (ключевые для отслеживания позиции бренда в ответе):
   «Топ-5 [ниша] в России 2026», «Лучшие [услуга] — рейтинг», «Назови трёх лидеров рынка [ниша]», «Какие компании [ниша] самые надёжные?»

3. **comparison** — сравнение с конкурентами:
   «${competitors[0] ?? "[компания1]"} или ${competitors[1] ?? "[компания2]"} — что лучше?», «Сравни [ниша] по цене и качеству», «Чем отличаются [конкурент] и [ниша-игрок]?»

4. **conversational** — диалоговые вопросы (стиль Perplexity, Алиса):
   «Помоги выбрать [услугу], я [описание ситуации]», «Объясни разницу между [вариант А] и [вариант Б] в [нише]», «Я новичок в [ниша], с чего начать?»

5. **rag** — запросы с явным запросом источников (активируют RAG-цитирование):
   «Посоветуй [услугу] со ссылками на проверенные источники», «Где прочитать честные отзывы о [ниша]?», «Какие авторитетные ресурсы про [нишу] существуют?»

6. **price** — ценовые запросы:
   «Сколько стоит [услуга]?», «Средняя цена [ниша] в 2026», «Какой бюджет нужен для [задача]?»

7. **problem** — запросы про боль / проблему:
   «Как решить [конкретная проблема в нише]?», «Что делать если [типичная ошибка]?», «Почему [нишевая проблема] возникает и как избежать?»

Дополнительные требования:
- 70% запросов на русском, 30% на английском (английские — для ChatGPT, Claude, Perplexity)
- Запросы — естественная разговорная речь, не SEO-ключи
- НЕ генерируй запросы про саму компанию «${companyName}» — только про нишу в целом
- Каждый запрос должен быть уникальным и реалистичным
- Используй конкретные детали ниши «${niche}», а не абстрактные шаблоны

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
