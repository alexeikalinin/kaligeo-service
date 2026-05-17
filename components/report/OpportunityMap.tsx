const PLATFORM_LABELS: Record<string, string> = {
  CHATGPT: "ChatGPT",
  CLAUDE: "Claude",
  GEMINI: "Gemini",
  PERPLEXITY: "Perplexity",
  DEEPSEEK: "DeepSeek",
  YANDEXGPT: "YandexGPT",
  GIGACHAT: "GigaChat",
  ALISA: "Алиса",
}

interface QueryResult {
  id: string
  platform: string
  query: string
  response: string
  brandMentioned: boolean
  sentiment: string
}

interface Props {
  results: QueryResult[]
  companyName: string
  competitorNames: string[]
}

function extractMentionedCompetitors(response: string, competitorNames: string[]): string[] {
  return competitorNames.filter((name) =>
    response.toLowerCase().includes(name.toLowerCase())
  )
}

export function OpportunityMap({ results, companyName, competitorNames }: Props) {
  const missed = results
    .filter((r) => !r.brandMentioned)
    .slice(0, 8)

  if (!missed.length) return null

  return (
    <section>
      <p className="t-eyebrow mb-2">Карта возможностей</p>
      <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}>
        Запросы где вас нет — но могли бы быть
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
        Реальные вопросы которые покупатели задают AI прямо сейчас.
        В каждом ответе AI рекомендует конкурентов вместо вас.
      </p>

      <div className="space-y-2">
        {missed.map((r, i) => {
          const mentioned = extractMentionedCompetitors(r.response, competitorNames)
          const platform = PLATFORM_LABELS[r.platform] ?? r.platform

          return (
            <div
              key={r.id}
              className="flex items-start gap-4 rounded-lg px-4 py-3"
              style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
            >
              {/* Number */}
              <span
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                style={{ background: "var(--rule)", color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}
              >
                {i + 1}
              </span>

              {/* Query */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="monotag text-xs" style={{ color: "var(--ink-2)" }}>{platform}</span>
                  <span className="text-xs font-medium" style={{ color: "#ef4444", fontFamily: "var(--font-mono)" }}>
                    ✗ {companyName} не упомянут
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--ink)", fontStyle: "italic" }}>
                  «{r.query}»
                </p>
                {mentioned.length > 0 && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs" style={{ color: "var(--ink-3)" }}>AI назвал:</span>
                    {mentioned.map((name) => (
                      <span
                        key={name}
                        className="text-xs font-medium px-1.5 py-0.5 rounded"
                        style={{ background: "#fef2f2", color: "#ef4444", border: "1px solid #fca5a5" }}
                      >
                        {name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs mt-4" style={{ color: "var(--ink-3)" }}>
        Каждый из этих запросов — потенциальный клиент который сейчас уходит к конкуренту.
        Действия из плана роста напрямую адресуют эти пробелы.
      </p>
    </section>
  )
}
