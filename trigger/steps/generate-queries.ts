import OpenAI from "openai"
import { getQueryCountForTier, type Tier } from "../../lib/gates"

function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function generateQueries(
  companyName: string,
  niche: string,
  competitors: string[],
  tier: "BASIC" | "STANDARD" | "ADVANCED"
): Promise<string[]> {
  const count = getQueryCountForTier(tier as Tier)

  const prompt = `Ты составляешь поисковые запросы для AI-аудита видимости бренда.

Компания: ${companyName}
Ниша / отрасль: ${niche}
Конкуренты: ${competitors.join(", ")}

Сгенерируй ровно ${count} запросов, которые потенциальный клиент реалистично напишет в ChatGPT, Perplexity, YandexGPT или Claude, когда ищет товар/услугу в данной нише.

Требования:
- 85% запросов на русском, 15% на английском
- Типы запросов (распредели равномерно):
  • Рекомендация: «Какую [услугу] выбрать?», «Посоветуй [нишу]»
  • Сравнение: «[A] или [B] — что лучше?», «Плюсы и минусы [ниша]»
  • Цена: «Сколько стоит [услуга]?», «Средний чек [ниша]»
  • Как сделать: «Как выбрать [услугу]?», «На что обратить внимание при выборе»
  • Проблема/боль: вопрос про конкретную проблему которую решает ниша
- Запросы — естественная разговорная речь, не SEO-ключи
- НЕ генерируй запросы про саму компанию («что такое ${companyName}») — только про нишу в целом

Верни JSON-объект с единственным полем "queries" — массив строк:
{"queries": ["запрос 1", "запрос 2", ...]}`

  const response = await getClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  })

  const text = response.choices[0]?.message?.content ?? "{}"
  const parsed = JSON.parse(text)
  const queries: string[] = Array.isArray(parsed) ? parsed : (parsed.queries ?? [])
  return queries.slice(0, count)
}
