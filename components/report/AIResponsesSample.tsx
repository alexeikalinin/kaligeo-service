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
}

const PLATFORM_LABELS: Record<string, string> = {
  CHATGPT: "ChatGPT",
  CLAUDE: "Claude",
  GEMINI: "Gemini",
  PERPLEXITY: "Perplexity",
  DEEPSEEK: "DeepSeek",
  YANDEXGPT: "YandexGPT",
  GIGACHAT: "GigaChat",
}

const SENTIMENT_CONFIG: Record<string, { label: string; color: string }> = {
  positive: { label: "Позитив", color: "var(--accent)" },
  neutral: { label: "Нейтрально", color: "var(--ink-3)" },
  negative: { label: "Негатив", color: "#ef4444" },
  absent: { label: "Не упомянут", color: "var(--ink-3)" },
}

// Fallback — показывается только если реальных результатов нет (не должно случаться в рабочем отчёте)
const MOCK_RESULTS: QueryResult[] = []

function highlightText(
  text: string,
  companyName: string
): React.ReactNode[] {
  const preview = text.slice(0, 400)
  const lowerPreview = preview.toLowerCase()
  const lowerCompany = companyName.toLowerCase()

  const parts: React.ReactNode[] = []
  let cursor = 0

  // Find all highlight positions
  const highlights: { start: number; end: number; type: "brand" }[] = []

  let idx = lowerPreview.indexOf(lowerCompany)
  while (idx !== -1) {
    highlights.push({ start: idx, end: idx + lowerCompany.length, type: "brand" })
    idx = lowerPreview.indexOf(lowerCompany, idx + 1)
  }

  highlights.sort((a, b) => a.start - b.start)

  for (const h of highlights) {
    if (cursor < h.start) {
      parts.push(preview.slice(cursor, h.start))
    }
    parts.push(
      <mark
        key={h.start}
        style={{
          background: "#bbf7d0",
          color: "inherit",
          borderRadius: "2px",
          padding: "0 2px",
        }}
      >
        {preview.slice(h.start, h.end)}
      </mark>
    )
    cursor = h.end
  }

  if (cursor < preview.length) {
    parts.push(preview.slice(cursor))
  }

  if (text.length > 400) {
    parts.push(
      <span key="ellipsis" style={{ color: "var(--ink-3)" }}>
        …
      </span>
    )
  }

  return parts
}

export function AIResponsesSample({ results, companyName }: Props) {
  // Prioritise results where brand is NOT mentioned, then fill with mentioned ones
  const notMentioned = results.filter((r) => !r.brandMentioned)
  const mentioned = results.filter((r) => r.brandMentioned)
  const sorted = [...notMentioned, ...mentioned]
  const display = sorted.slice(0, 4)

  if (display.length === 0) return null

  return (
    <section>
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
          Примеры ответов AI
        </h2>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
        Реальные запросы — приоритет показа там, где бренд не упоминается
      </p>

      <div className="space-y-3">
        {display.map((r) => {
          const sentiment = SENTIMENT_CONFIG[r.sentiment] ?? SENTIMENT_CONFIG.absent
          const platformLabel = PLATFORM_LABELS[r.platform] ?? r.platform

          return (
            <div
              key={r.id}
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--rule)",
                background: "var(--bone-2)",
              }}
            >
              {/* Header */}
              <div
                className="flex items-start gap-3 px-4 pt-4 pb-3"
                style={{ borderBottom: "1px solid var(--rule)" }}
              >
                <span
                  className="monotag shrink-0 text-xs"
                  style={{ color: "var(--ink-2)" }}
                >
                  {platformLabel}
                </span>
                <p
                  className="text-sm flex-1 leading-snug"
                  style={{
                    color: "var(--ink)",
                    fontStyle: "italic",
                  }}
                >
                  {r.query}
                </p>
              </div>

              {/* Response body */}
              <div className="px-4 py-3">
                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--ink-2)" }}
                >
                  {highlightText(r.response, companyName)}
                </p>
              </div>

              {/* Footer */}
              <div
                className="flex items-center gap-3 px-4 pb-3"
              >
                <span
                  className="text-xs font-medium"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: r.brandMentioned ? "#16a34a" : "#ef4444",
                  }}
                >
                  {r.brandMentioned ? "✓ Упоминается" : "✗ Не упоминается"}
                </span>
                <span
                  className="monotag text-xs"
                  style={{ color: sentiment.color, borderColor: sentiment.color }}
                >
                  {sentiment.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
