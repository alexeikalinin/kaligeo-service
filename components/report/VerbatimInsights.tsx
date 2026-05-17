export interface VerbatimQuote {
  platform: string
  query: string
  excerpt: string
  brandsMentioned: string[]
  isOurs: boolean
}

interface VerbatimInsightsProps {
  quotes: VerbatimQuote[]
  companyName: string
}

const PLATFORM_LABELS: Record<string, string> = {
  CHATGPT:    "ChatGPT",
  CLAUDE:     "Claude",
  GEMINI:     "Gemini",
  PERPLEXITY: "Perplexity",
  DEEPSEEK:   "DeepSeek",
  YANDEXGPT:  "YandexGPT",
  GIGACHAT:   "GigaChat",
  ALISA:      "Алиса",
}

const MOCK_QUOTES: VerbatimQuote[] = [
  {
    platform: "CHATGPT",
    query: "Лучшие сервисы бухгалтерии для ИП",
    excerpt:
      "Для ведения бухгалтерии ИП на УСН я рекомендую рассмотреть несколько популярных решений. Моё дело — один из самых популярных сервисов для малого бизнеса, предлагает автоматизацию отчётности и интеграцию с банками. Контур.Бухгалтерия подойдёт тем, кто работает с несколькими системами налогообложения.",
    brandsMentioned: ["Моё дело", "Контур.Бухгалтерия"],
    isOurs: false,
  },
  {
    platform: "PERPLEXITY",
    query: "Сколько стоит аутсорс бухгалтерии",
    excerpt:
      "Стоимость аутсорсинговой бухгалтерии варьируется от 3 000 до 25 000 руб/мес. Среди популярных сервисов: Моё дело (от 1 633/мес), Контур.Бухгалтерия (от 1 700/мес) и 1С:БухОбслуживание (тарифы зависят от региона и объёма).",
    brandsMentioned: ["Моё дело", "Контур.Бухгалтерия", "1С:БухОбслуживание"],
    isOurs: false,
  },
  {
    platform: "YANDEXGPT",
    query: "Надёжная бухгалтерия для малого бизнеса",
    excerpt:
      "Для малого бизнеса хорошо зарекомендовали себя Моё дело и СберБухгалтерия — оба сервиса предлагают автоматизацию отчётности и напоминания о дедлайнах. При большом объёме операций стоит рассмотреть 1С:БухОбслуживание.",
    brandsMentioned: ["Моё дело", "СберБухгалтерия", "1С:БухОбслуживание"],
    isOurs: false,
  },
]

function highlightExcerpt(
  excerpt: string,
  brandsMentioned: string[],
  companyName: string
): React.ReactNode[] {
  // Build list: our brand + other brands
  const allBrands = brandsMentioned.slice()
  if (!allBrands.includes(companyName)) {
    // still we need to highlight it if found in text
    allBrands.unshift(companyName)
  }

  // Sort by length desc to match longer names first
  const sorted = [...allBrands].sort((a, b) => b.length - a.length)

  // Split text by brand occurrences
  const pattern = new RegExp(`(${sorted.map((b) => b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi")
  const parts = excerpt.split(pattern)

  return parts.map((part, i) => {
    const isOurBrand = part.toLowerCase() === companyName.toLowerCase()
    const isOtherBrand = brandsMentioned.some(
      (b) => b.toLowerCase() === part.toLowerCase() && !isOurBrand
    )

    if (isOurBrand) {
      return (
        <mark
          key={i}
          style={{ background: "#bbf7d0", color: "var(--ink)", borderRadius: "2px", padding: "0 2px" }}
        >
          {part}
        </mark>
      )
    }
    if (isOtherBrand) {
      return (
        <mark
          key={i}
          style={{ background: "#fef08a", color: "var(--ink)", borderRadius: "2px", padding: "0 2px" }}
        >
          {part}
        </mark>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export function VerbatimInsights({ quotes, companyName }: VerbatimInsightsProps) {
  const displayQuotes = quotes.length > 0 ? quotes : MOCK_QUOTES
  const isMock = quotes.length === 0

  return (
    <section>
      <p className="t-eyebrow mb-1">Реальные ответы AI</p>
      <h2
        className="text-lg font-bold mb-1"
        style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
      >
        Дословно: что AI говорит клиентам вашей ниши
      </h2>
      {isMock && (
        <p className="text-xs mb-5" style={{ color: "var(--ink-3)" }}>
          Примеры ответов AI на типичные запросы в нише. Реальные данные появятся после аудита.
        </p>
      )}
      {!isMock && (
        <p className="text-xs mb-5" style={{ color: "var(--ink-3)" }}>
          Фрагменты реальных ответов AI-платформ на запросы вашей категории.{" "}
          <mark style={{ background: "#bbf7d0", color: "var(--ink)", borderRadius: "2px", padding: "0 2px" }}>
            Зелёным
          </mark>{" "}
          выделен ваш бренд,{" "}
          <mark style={{ background: "#fef08a", color: "var(--ink)", borderRadius: "2px", padding: "0 2px" }}>
            жёлтым
          </mark>{" "}
          — конкуренты.
        </p>
      )}

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}
      >
        {displayQuotes.map((quote, idx) => (
          <div
            key={idx}
            className="rounded-xl p-5"
            style={{
              background: "var(--bone-2)",
              border: "1px solid var(--rule)",
              position: "relative",
              opacity: isMock ? 0.85 : 1,
            }}
          >
            {/* Query */}
            <div className="flex items-start gap-2 mb-3">
              <span
                className="text-xs shrink-0 mt-0.5"
                style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}
              >
                ↳
              </span>
              <p
                className="text-xs italic"
                style={{ color: "var(--ink-2)" }}
              >
                «{quote.query}»
              </p>
            </div>

            {/* Platform tag */}
            <div className="flex items-center gap-2 mb-3">
              <span className="monotag">
                {PLATFORM_LABELS[quote.platform] ?? quote.platform}
              </span>
              {isMock && (
                <span className="monotag" style={{ color: "var(--ink-3)" }}>демо</span>
              )}
            </div>

            {/* Excerpt */}
            <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--ink)" }}>
              {highlightExcerpt(quote.excerpt, quote.brandsMentioned, companyName)}
            </p>

            {/* Our brand presence */}
            {!quote.isOurs && (
              <p
                className="text-xs"
                style={{
                  color: "var(--ink-3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.05em",
                }}
              >
                ✗ Ваш бренд не упомянут
              </p>
            )}

            {/* Mentioned brands bar */}
            {quote.brandsMentioned.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {quote.brandsMentioned.map((b) => (
                  <span
                    key={b}
                    className="monotag"
                    style={{
                      fontSize: "9px",
                      padding: "2px 5px",
                      background:
                        b.toLowerCase() === companyName.toLowerCase() ? "#bbf7d0" : "#fef08a",
                      borderColor:
                        b.toLowerCase() === companyName.toLowerCase() ? "#86efac" : "#fde047",
                      color: "var(--accent-ink)",
                    }}
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
