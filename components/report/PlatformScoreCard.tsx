"use client"

import { useState } from "react"

interface PlatformScore {
  platform: string
  score: number
  citationRate: number
  totalQueries: number
  mentionCount: number
  positiveCount: number
}

interface WeakPoint {
  id: string
  title: string
  description: string
  severity: "high" | "medium" | "low"
}

interface Props {
  score: PlatformScore
  benchmarkScore?: number
  trend?: "up" | "down" | "flat"
  weakPoints?: WeakPoint[]
  history?: number[] // historical scores oldest→newest
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
  ALISA: "Алиса",
  GROK: "Grok",
}

const TREND_CONFIG = {
  up: { symbol: "↑", color: "#16a34a" },
  down: { symbol: "↓", color: "#ef4444" },
  flat: { symbol: "—", color: "var(--ink-3)" },
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const W = 40
  const H = 16
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W
      const y = H - ((v - min) / range) * H
      return `${x},${y}`
    })
    .join(" ")
  return (
    <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* last point dot */}
      {(() => {
        const last = values[values.length - 1]
        const x = W
        const y = H - ((last - min) / range) * H
        return <circle cx={x} cy={y} r="2" fill={color} />
      })()}
    </svg>
  )
}

export function PlatformScoreCard({ score, benchmarkScore, trend, weakPoints, history }: Props) {
  const isDark = score.score === 0
  const [expanded, setExpanded] = useState(isDark)

  const citationPct =
    score.totalQueries > 0
      ? Math.round((score.mentionCount / score.totalQueries) * 100)
      : 0

  const r = 34
  const circ = 2 * Math.PI * r
  const dash = (score.score / 100) * circ
  const color = isDark ? "#6A6D75" : scoreAccent(score.score)
  const trendCfg = trend ? TREND_CONFIG[trend] : null
  const benchmarkPct = benchmarkScore !== undefined ? Math.min(100, Math.max(0, benchmarkScore)) : null

  // Find relevant weak point for this platform
  const platformLabel = PLATFORM_LABELS[score.platform] ?? score.platform
  const whyPoint = weakPoints?.find(
    (w) => w.title.toLowerCase().includes(platformLabel.toLowerCase()) || w.description.toLowerCase().includes(platformLabel.toLowerCase())
  ) ?? (isDark ? weakPoints?.[0] : null)

  const bg = isDark ? "var(--ink-card)" : "var(--bone-2)"
  const textColor = isDark ? "var(--bone)" : "var(--ink)"
  const mutedColor = isDark ? "rgba(245,245,240,0.5)" : "var(--ink-3)"

  return (
    <div
      className="rounded-xl flex flex-col"
      style={{
        border: isDark ? "1px solid var(--ink-border)" : "1px solid var(--rule)",
        background: bg,
        cursor: whyPoint ? "pointer" : "default",
        transition: "transform 0.15s",
      }}
      onClick={() => whyPoint && setExpanded((v) => !v)}
    >
      {/* Main card content */}
      <div className="p-5 flex flex-col items-center gap-3">
        <div className="flex items-center gap-2">
          <p
            className="t-eyebrow"
            style={isDark ? { color: mutedColor, "--tw-before-content": "none" } as React.CSSProperties : {}}
          >
            {platformLabel}
          </p>
          {trendCfg && (
            <span
              className="text-sm font-bold"
              style={{ color: trendCfg.color, fontFamily: "var(--font-mono)" }}
            >
              {trendCfg.symbol}
            </span>
          )}
          {history && history.length >= 2 && (
            <Sparkline values={history} color={color} />
          )}
        </div>

        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r={r} fill="none" stroke={isDark ? "#2A2D35" : "var(--rule)"} strokeWidth="7" />
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
              fill: isDark ? "var(--bone-2)" : color,
            }}
          >
            {score.score}
          </text>
        </svg>

        {/* Benchmark bar */}
        <div className="w-full">
          <div
            className="relative h-2 rounded-full overflow-visible"
            style={{ background: isDark ? "#2A2D35" : "var(--rule)" }}
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${score.score}%`, background: color }}
            />
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
            <span className="text-xs" style={{ color: mutedColor, fontFamily: "var(--font-mono)" }}>
              0
            </span>
            <span className="text-xs" style={{ color: mutedColor, fontFamily: "var(--font-mono)" }}>
              лидер ~{benchmarkScore ?? 72}
            </span>
          </div>
        </div>

        <div className="text-center space-y-1 w-full">
          {score.mentionCount === 0 ? (
            <p className="text-xs font-medium" style={{ color: isDark ? "#ef4444" : "#ef4444" }}>
              Не упоминается
            </p>
          ) : (
            <p className="text-xs" style={{ color: mutedColor }}>
              {score.mentionCount}/{score.totalQueries} упоминаний ({citationPct}%)
            </p>
          )}
          {score.positiveCount > 0 && (
            <p className="text-xs" style={{ color: mutedColor }}>
              Позитивных: {score.positiveCount}
            </p>
          )}
        </div>

        {/* Toggle hint */}
        {whyPoint && (
          <div
            style={{
              fontSize: "11px",
              color: isDark ? "rgba(245,245,240,0.4)" : "var(--ink-3)",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
                display: "inline-block",
              }}
            >
              ▾
            </span>
            Почему?
          </div>
        )}
      </div>

      {/* Expandable WHY block */}
      {whyPoint && expanded && (
        <div
          style={{
            borderTop: `1px solid ${isDark ? "#2A2D35" : "var(--rule)"}`,
            padding: "12px 16px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: isDark ? "rgba(245,245,240,0.5)" : "var(--ink-3)",
              margin: "0 0 6px",
            }}
          >
            Почему?
          </p>
          <p style={{ fontSize: "12px", color: isDark ? "var(--bone-2)" : "var(--ink-2)", lineHeight: 1.55, margin: "0 0 10px" }}>
            {whyPoint.description}
          </p>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "var(--accent)",
              margin: 0,
            }}
          >
            → {whyPoint.title}
          </p>
        </div>
      )}
    </div>
  )
}
