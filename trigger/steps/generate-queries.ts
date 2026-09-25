import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"
import Anthropic from "@anthropic-ai/sdk"
import { getQueryCountForTier, type Tier } from "../../lib/gates"
import { QUERY_GEN_MODEL, QUERY_GEN_MODEL_B, QUERY_JUDGE_MODEL } from "../../lib/models"
import type { QueryOptimizationHints } from "../../lib/agents/query-optimizer-agent"

export interface SiteContext {
  description: string
  services: string[]
  targetAudience: string
}

const MAX_WORDS = 16

function getOpenAIClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

function extractQueries(text: string): string[] {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
  return Array.isArray(parsed) ? parsed : (parsed.queries ?? [])
}

async function generateWithOpenAI(prompt: string): Promise<string[]> {
  const response = await getOpenAIClient().chat.completions.create({
    model: QUERY_GEN_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 1.1,
    max_tokens: 4000,
  })
  return extractQueries(response.choices[0]?.message?.content ?? "{}")
}

async function generateWithGemini(prompt: string): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "")
  const model = genAI.getGenerativeModel({ model: QUERY_GEN_MODEL_B })
  const result = await model.generateContent(
    prompt + '\n\nВерни ТОЛЬКО валидный JSON объект {"queries": [...]} без markdown-блоков.'
  )
  return extractQueries(result.response.text())
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
Целевая аудитория: ${siteContext.targetAudience || "не определена"}
Если в целевой аудитории или услугах явно видно НЕСКОЛЬКО разных сегментов (например конечные потребители и одновременно бизнес-партнёры/B2B-клиенты) — распредели вопросы между всеми сегментами, а не только одним.\n`
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
- Каждый запрос — короткая фраза или одно предложение, максимум ${MAX_WORDS} слов. Это не эссе, это то, что человек реально печатает в чат за 5 секунд. Экономия токенов важна: короче формулировка — дешевле обходится запуск на 6+ AI-платформах.
- Запросы — естественная разговорная речь, не SEO-ключи
- НЕ генерируй запросы про саму компанию «${companyName}» — только про нишу в целом
- Внутри каждой категории и между категориями запросы должны различаться грамматической конструкцией (не все начинаются с глагола в повелительном наклонении, не все — вопросом "Какой/Какая")
- Каждый запрос должен быть уникальным и реалистичным
- Используй конкретные детали ниши и то, чем реально занимается компания (см. блок выше), а не абстрактные шаблоны — если ниша заявлена неточно, ориентируйся на реальное описание сайта

Верни JSON-объект с единственным полем "queries" — массив строк (без меток категорий в тексте):
{"queries": ["запрос 1", "запрос 2", ...]}`

  return prompt
}

function normalizeForDedup(q: string): Set<string> {
  return new Set(
    q.toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  )
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  const intersection = [...a].filter((x) => b.has(x)).length
  const union = new Set([...a, ...b]).size
  return union === 0 ? 0 : intersection / union
}

/**
 * Механические проверки — дешевле и надёжнее гонять в коде, чем поручать
 * третьей модели-судье: самоупоминание бренда (баг, который реально ловили
 * у Perplexity) и превышение лимита длины (ловили у Gemini) — это не
 * семантическая оценка, а детерминированная проверка строки.
 */
export function filterCandidates(candidates: string[], companyName: string): string[] {
  const brandLower = companyName.trim().toLowerCase()
  const seenTokenSets: Set<string>[] = []
  const result: string[] = []

  for (const raw of candidates) {
    const q = raw.trim()
    if (!q) continue
    if (q.split(/\s+/).length > MAX_WORDS) continue
    if (brandLower && q.toLowerCase().includes(brandLower)) continue

    const tokens = normalizeForDedup(q)
    const isDuplicate = seenTokenSets.some((s) => jaccardSimilarity(s, tokens) > 0.7)
    if (isDuplicate) continue

    seenTokenSets.push(tokens)
    result.push(q)
  }

  return result
}

/** Чередует кандидатов из двух генераторов, чтобы даже без судьи (fallback)
 * итоговая выборка не была перекошена в сторону одной модели. */
function interleave(a: string[], b: string[]): string[] {
  const result: string[] = []
  const max = Math.max(a.length, b.length)
  for (let i = 0; i < max; i++) {
    if (a[i]) result.push(a[i])
    if (b[i]) result.push(b[i])
  }
  return result
}

/**
 * Третья модель отбирает финальные `count` вопросов из объединённого пула
 * кандидатов от двух генераторов — балансирует по сегментам аудитории и
 * категориям намерений, которые ни один генератор в одиночку не покрывает
 * целиком (см. находку: одни модели видят только B2C-аудиторию, другие —
 * только B2B). Работает по индексам, а не переписывает текст — дешевле и
 * не рискует перефразировать вопрос в процессе отбора.
 */
async function judgeAndSelect(
  candidates: string[],
  count: number,
  companyName: string,
  niche: string,
  siteContext?: SiteContext
): Promise<string[]> {
  if (candidates.length <= count) return candidates

  const list = candidates.map((q, i) => `${i + 1}. ${q}`).join("\n")
  const audienceBlock = siteContext
    ? `Целевая аудитория (может включать несколько разных сегментов — например конечных потребителей и отдельно B2B-партнёров): ${siteContext.targetAudience}\nУслуги компании: ${siteContext.services.join(", ") || "не определены"}`
    : "Данных о целевой аудитории нет — суди по нише и запросам."

  const prompt = `Ты отбираешь лучшие ${count} поисковых запросов из пула кандидатов для GEO-аудита видимости бренда «${companyName}» (ниша: ${niche}).
${audienceBlock}

Кандидаты (пронумерованы, собраны из двух независимых генераций разными моделями):
${list}

Отбери ровно ${count} лучших по критериям:
1. Покрой ВСЕ сегменты целевой аудитории, если их несколько (не бери вопросы только с одного ракурса, если сайт явно обслуживает разные типы клиентов).
2. Убери вопросы, которые по смыслу почти дублируют уже выбранные, даже если сформулированы разными словами.
3. Предпочитай вопросы, которые реалистичный человек реально напишет в чат, а не канцелярские или неестественные формулировки.
4. Сохраняй баланс между разными типами вопросов (рекомендации, рейтинги, сравнения, разговорные с контекстом, запросы источников, про цену, про проблему) — не допускай перекоса в одну категорию.

Верни JSON {"selected": [номера кандидатов через запятую, ровно ${count} штук]} без пояснений.`

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: QUERY_JUDGE_MODEL,
    max_tokens: 1000,
    system: "Отвечай ТОЛЬКО валидным JSON без markdown-блоков, без пояснений.",
    messages: [{ role: "user", content: prompt }],
  })
  const block = response.content[0]
  const text = block.type === "text" ? block.text : "{}"
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
  const indices: number[] = Array.isArray(parsed.selected) ? parsed.selected : []

  const selected = indices
    .map((i) => candidates[i - 1])
    .filter((q): q is string => Boolean(q))

  const unique = [...new Set(selected)].slice(0, count)
  return unique.length > 0 ? unique : candidates.slice(0, count)
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

  // Два независимых генератора параллельно — разные модели видят нишу под
  // разными углами (проверено эмпирически: одна модель тянет к B2C-вопросам,
  // другая — к B2B), объединённый пул даёт судье реальный выбор.
  const [genA, genB] = await Promise.allSettled([
    generateWithOpenAI(prompt),
    generateWithGemini(prompt),
  ])

  if (genA.status === "rejected") console.warn("[generateQueries] generator A (OpenAI) failed:", genA.reason)
  if (genB.status === "rejected") console.warn("[generateQueries] generator B (Gemini) failed:", genB.reason)

  const pool = interleave(
    genA.status === "fulfilled" ? genA.value : [],
    genB.status === "fulfilled" ? genB.value : []
  )

  if (pool.length === 0) {
    throw new Error("Both query generators failed — cannot generate audit queries")
  }

  const filtered = filterCandidates(pool, companyName)
  const candidatePool = filtered.length > 0 ? filtered : pool

  let aiQueries: string[]
  try {
    aiQueries = await judgeAndSelect(candidatePool, aiCount, companyName, niche, siteContext)
  } catch (e) {
    console.warn("[generateQueries] judge failed, falling back to interleaved selection:", e)
    aiQueries = candidatePool.slice(0, aiCount)
  }

  // Merge: custom prompts first (they're the client's priority), then AI-generated
  const merged = [...customEnabled, ...aiQueries].slice(0, count)
  return merged
}
