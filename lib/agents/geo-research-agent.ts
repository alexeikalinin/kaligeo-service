/**
 * GEO Research Agent
 *
 * Использует Perplexity sonar-pro для живого поиска актуальных
 * GEO-рекомендаций по конкретным платформам перед генерацией плана роста.
 *
 * Подключается если:
 *   1. PERPLEXITY_API_KEY задан в env
 *   2. Платформа входит в список с низким скором
 *
 * Результат передаётся в growth-plan-agent как свежий контекст.
 */

export interface PlatformResearchResult {
  platform: string
  tips: string          // сырой текст из Perplexity
  sources: string[]     // URL-источники
  fetchedAt: string     // ISO timestamp
}

export interface GeoResearchResult {
  platformInsights: PlatformResearchResult[]
  summary: string       // краткий сводный контекст для growth-plan промпта
}

// Платформы с их уникальными сигналами — подсказываем Perplexity правильный фокус
const PLATFORM_QUERIES: Record<string, string> = {
  ChatGPT:    "how to get cited by ChatGPT in 2026: Wikipedia, fact density, brand mentions, content structure GEO optimization",
  Perplexity: "how to rank in Perplexity AI 2026: Reddit presence, quotable 40-60 word blocks, multi-format distribution, citations",
  Gemini:     "Google Gemini GEO optimization 2026: YouTube content, Google Business Profile, E-E-A-T signals, Article schema dateModified",
  Claude:     "how to get cited by Claude Anthropic 2026: Brave Search visibility, author credentials, JSON-LD Person schema, practitioner content",
  Grok:       "how to rank in Grok xAI 2026: X Twitter presence, xAI crawler robots.txt, real-time web signals, co-citation strategy",
  DeepSeek:   "DeepSeek AI brand visibility optimization 2026: GigaSearch alternative, platform-specific content strategy, open-source model",
  GigaChat:   "GigaChat Сбер видимость бренда оптимизация 2026: деловые СМИ РБК Ведомости GigaSearch русскоязычный контент",
  YandexGPT:  "YandexGPT видимость бренда 2026: Яндекс Дзен Кью Новости экосистема оптимизация",
  Alisa:      "Яндекс Алиса оптимизация видимости бренда 2026: Яндекс Бизнес Speakable Schema YandexAdditionalBot llms.txt",
}

async function fetchPerplexitySearch(query: string): Promise<{ text: string; citations: string[] }> {
  const apiKey = process.env.PERPLEXITY_API_KEY
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not configured")

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",   // search-enabled модель с актуальными данными
      messages: [
        {
          role: "system",
          content:
            "You are a GEO (Generative Engine Optimization) research assistant. " +
            "Extract the most specific, actionable, technical tips for brand visibility in AI systems. " +
            "Focus on platform-specific factors that differ from generic SEO advice. " +
            "Keep your answer concise: 5-7 bullet points with concrete actions, not general advice. " +
            "Answer in Russian.",
        },
        { role: "user", content: query },
      ],
      max_tokens: 600,
      return_citations: true,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Perplexity sonar-pro error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text: string = data.choices?.[0]?.message?.content ?? ""
  const citations: string[] = Array.isArray(data.citations) ? data.citations : []
  return { text, citations }
}

/**
 * Запускает живой поиск по платформам с низким скором.
 * Возвращает null если PERPLEXITY_API_KEY не задан (тихая деградация).
 */
export async function runGeoResearchAgent(
  platformScores: Record<string, { score: number }>,
  lowScoreThreshold = 40
): Promise<GeoResearchResult | null> {
  if (!process.env.PERPLEXITY_API_KEY) {
    console.log("[geo-research] PERPLEXITY_API_KEY not set — skipping live research")
    return null
  }

  // Отбираем платформы с низким скором (именно они нуждаются в свежих советах)
  const lowScorePlatforms = Object.entries(platformScores)
    .filter(([, s]) => s.score < lowScoreThreshold)
    .map(([name]) => name)
    .slice(0, 4) // не более 4 платформ за раз — экономим API calls

  if (lowScorePlatforms.length === 0) return null

  console.log(`[geo-research] Searching fresh GEO tips for: ${lowScorePlatforms.join(", ")}`)

  const results = await Promise.allSettled(
    lowScorePlatforms.map(async (platform): Promise<PlatformResearchResult> => {
      // Нормализуем имя платформы для поиска запроса
      const queryKey = Object.keys(PLATFORM_QUERIES).find(
        (k) => k.toLowerCase() === platform.toLowerCase()
      ) ?? platform

      const query = PLATFORM_QUERIES[queryKey] ?? `GEO optimization for ${platform} AI 2026 brand visibility tips`

      const { text, citations } = await fetchPerplexitySearch(query)
      return {
        platform,
        tips: text,
        sources: citations,
        fetchedAt: new Date().toISOString(),
      }
    })
  )

  const platformInsights: PlatformResearchResult[] = results
    .filter((r): r is PromiseFulfilledResult<PlatformResearchResult> => r.status === "fulfilled")
    .map((r) => r.value)

  if (platformInsights.length === 0) return null

  // Формируем сводный блок для промпта growth-plan-agent
  const summary = platformInsights
    .map(
      (p) =>
        `=== СВЕЖИЕ GEO-СОВЕТЫ ДЛЯ ${p.platform.toUpperCase()} (${new Date(p.fetchedAt).toLocaleDateString("ru-RU")}) ===\n` +
        p.tips +
        (p.sources.length > 0 ? `\nИсточники: ${p.sources.slice(0, 3).join(", ")}` : "")
    )
    .join("\n\n")

  return { platformInsights, summary }
}
