"use client"

interface PlatformScore {
  platform: string
  score: number
  citationRate: number
  totalQueries: number
  mentionCount: number
  positiveCount: number
}

interface Props {
  score: PlatformScore
  benchmarkScore?: number
  trend?: "up" | "down" | "flat"
}

function scoreAccent(score: number): string {
  if (score >= 60) return "var(--accent)"
  if (score >= 30) return "#f59e0b"
  return "#ef4444"
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

const TREND_CONFIG = {
  up: { symbol: "↑", color: "#16a34a" },
  down: { symbol: "↓", color: "#ef4444" },
  flat: { symbol: "—", color: "var(--ink-3)" },
}

export function PlatformScoreCard({ score, benchmarkScore, trend }: Props) {
  const citationPct =
    score.totalQueries > 0
      ? Math.round((score.mentionCount / score.totalQueries) * 100)
      : 0

  const r = 34
  const circ = 2 * Math.PI * r
  const dash = (score.score / 100) * circ
  const color = scoreAccent(score.score)
  const trendCfg = trend ? TREND_CONFIG[trend] : null

  // Benchmark position as percentage of bar width
  const benchmarkPct = benchmarkScore !== undefined ? Math.min(100, Math.max(0, benchmarkScore)) : null

  return (
    <div
      className="rounded-xl p-5 flex flex-col items-center gap-3"
      style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
    >
      <div className="flex items-center gap-2">
        <p className="t-eyebrow">{PLATFORM_LABELS[score.platform] ?? score.platform}</p>
        {trendCfg && (
          <span
            className="text-sm font-bold"
            style={{ color: trendCfg.color, fontFamily: "var(--font-mono)" }}
          >
            {trendCfg.symbol}
          </span>
        )}
      </div>

      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--rule)" strokeWidth="7" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 42 42)"
        />
        <text
          x="42"
          y="47"
          textAnchor="middle"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "18px",
            fontWeight: "bold",
            fill: color,
          }}
        >
          {score.score}
        </text>
      </svg>

      {/* Horizontal benchmark bar */}
      <div className="w-full">
        <div
          className="relative h-2 rounded-full overflow-visible"
          style={{ background: "var(--rule)" }}
        >
          {/* Company score fill */}
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: `${score.score}%`,
              background: color,
            }}
          />
          {/* Benchmark dashed line */}
          {benchmarkPct !== null && (
            <div
              className="absolute top-[-3px] h-[calc(100%+6px)] w-px"
              style={{
                left: `${benchmarkPct}%`,
                borderLeft: "2px dashed var(--ink-3)",
              }}
            />
          )}
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
            0
          </span>
          <span className="text-xs" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
            лидер ниши ~{benchmarkScore ?? 72}
          </span>
        </div>
      </div>

      <div className="text-center space-y-1 w-full">
        {score.mentionCount === 0 ? (
          <p className="text-xs font-medium" style={{ color: "#ef4444" }}>
            Не упоминается
          </p>
        ) : (
          <p className="text-xs" style={{ color: "var(--ink-3)" }}>
            Упоминаний: {score.mentionCount}/{score.totalQueries} ({citationPct}%)
          </p>
        )}
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Позитивных: {score.positiveCount}
        </p>
      </div>
    </div>
  )
}
