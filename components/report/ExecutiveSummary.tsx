interface PlatformScore {
  platform: string
  score: number
  citationRate: number
  mentionCount: number
  totalQueries: number
}

interface WeakPoint {
  title: string
  severity: string
  detected: boolean
}

interface CompetitorEntry {
  name: string
  platforms: string[]
  mentionCount: number
}

interface Props {
  companyName: string
  overallScore: number
  platformScores: Record<string, PlatformScore>
  weakPoints: WeakPoint[]
  competitorMatrix: CompetitorEntry[]
  tier: string
  benchmarkScore?: number
}

function brandLabel(score: number): string {
  if (score < 30) return "Невидимая компания"
  if (score < 60) return "Частично известная"
  return "Узнаваемый бренд"
}

export function ExecutiveSummary({
  companyName,
  overallScore,
  platformScores,
  weakPoints,
  competitorMatrix,
  benchmarkScore,
}: Props) {
  const criticalCount = weakPoints.filter(
    (w) => w.severity === "high" && w.detected
  ).length

  const scores = Object.values(platformScores)
  const bestPlatform =
    scores.length > 0
      ? scores.reduce((a, b) => (a.score >= b.score ? a : b))
      : null

  const topCompetitor = competitorMatrix[0] ?? null

  // Find best and second-best platform citation rates for the insight line
  const chatgptScore = platformScores["CHATGPT"]
  const myMentionPct =
    chatgptScore && chatgptScore.totalQueries > 0
      ? Math.round((chatgptScore.mentionCount / chatgptScore.totalQueries) * 100)
      : null

  const PLATFORM_LABELS: Record<string, string> = {
    CHATGPT: "ChatGPT",
    CLAUDE: "Claude",
    GEMINI: "Gemini",
    PERPLEXITY: "Perplexity",
    DEEPSEEK: "DeepSeek",
    YANDEXGPT: "YandexGPT",
    GIGACHAT: "GigaChat",
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--bone-2)",
    border: "1px solid var(--rule)",
    borderRadius: "var(--radius-lg, 12px)",
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  }

  return (
    <section>
      <p className="t-eyebrow mb-4">Резюме аудита</p>

      <div
        className="grid gap-4 mb-6"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        }}
      >
        {/* Block 1: Brand perception */}
        <div style={cardStyle}>
          <p className="t-eyebrow" style={{ color: "var(--ink-3)" }}>
            AI знает вас как
          </p>
          <p
            className="text-xl font-bold leading-tight"
            style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
          >
            {brandLabel(overallScore)}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            Так вас видят 7 AI-систем
          </p>
        </div>

        {/* Block 2: Top competitor */}
        <div style={cardStyle}>
          <p className="t-eyebrow" style={{ color: "var(--ink-3)" }}>
            Главный конкурент
          </p>
          {topCompetitor ? (
            <>
              <p
                className="text-xl font-bold leading-tight truncate"
                style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
              >
                {topCompetitor.name}
              </p>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                {topCompetitor.mentionCount} упоминаний · называется вместо вас
              </p>
            </>
          ) : (
            <p
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-serif)", color: "var(--ink-3)" }}
            >
              —
            </p>
          )}
        </div>

        {/* Block 3: Critical issues */}
        <div style={cardStyle}>
          <p className="t-eyebrow" style={{ color: "var(--ink-3)" }}>
            Критических проблем
          </p>
          <p
            className="text-3xl font-bold leading-tight"
            style={{
              fontFamily: "var(--font-mono)",
              color: criticalCount > 0 ? "#ef4444" : "var(--ink)",
            }}
          >
            {criticalCount}
          </p>
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            Мешают AI вас рекомендовать
          </p>
        </div>

        {/* Block 4b: Benchmark */}
        {benchmarkScore !== undefined && (
          <div style={cardStyle}>
            <p className="t-eyebrow" style={{ color: "var(--ink-3)" }}>
              Средний score в нише
            </p>
            <p
              className="text-3xl font-bold leading-tight"
              style={{
                fontFamily: "var(--font-mono)",
                color: overallScore < benchmarkScore ? "#ef4444" : "#16a34a",
              }}
            >
              {benchmarkScore}
            </p>
            <p
              className="text-xs"
              style={{ color: overallScore < benchmarkScore ? "#ef4444" : "#16a34a" }}
            >
              {overallScore < benchmarkScore
                ? `Вы на ${benchmarkScore - overallScore} пунктов ниже среднего`
                : `Вы на ${overallScore - benchmarkScore} пунктов выше среднего`}
            </p>
          </div>
        )}

        {/* Block 4: Best platform */}
        <div style={cardStyle}>
          <p className="t-eyebrow" style={{ color: "var(--ink-3)" }}>
            Лучшая платформа
          </p>
          {bestPlatform ? (
            <>
              <p
                className="text-xl font-bold leading-tight"
                style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
              >
                {PLATFORM_LABELS[bestPlatform.platform] ?? bestPlatform.platform}
              </p>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                Здесь вас знают лучше всего · {bestPlatform.score}/100
              </p>
            </>
          ) : (
            <p
              className="text-xl font-bold leading-tight"
              style={{ fontFamily: "var(--font-serif)", color: "var(--ink-3)" }}
            >
              —
            </p>
          )}
        </div>
      </div>

      {/* Insight line */}
      {topCompetitor && chatgptScore && myMentionPct !== null && (
        <div
          className="rounded-lg px-4 py-3 text-sm"
          style={{
            background: "var(--bone-2)",
            border: "1px solid var(--rule)",
            color: "var(--ink-2)",
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-3)" }}>
            ИНСАЙТ ·{" "}
          </span>
          ChatGPT называет{" "}
          <strong style={{ color: "var(--ink)" }}>{topCompetitor.name}</strong>{" "}
          в ответ на запросы вашей категории,{" "}
          {companyName} — только в {myMentionPct}% случаев.
        </div>
      )}
    </section>
  )
}
