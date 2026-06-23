"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

interface TrendPoint {
  id: string
  tier: string
  createdAt: string
  completedAt: string | null
  overallScore: number
  platformScores: Record<string, {
    platform: string
    score: number
    citationRate: number
  }>
}

interface TrendsChartProps {
  jobId: string
  token: string
  clientEmail: string
  companyName: string
}

const PLATFORM_COLORS: Record<string, string> = {
  CHATGPT:    "#10a37f",
  CLAUDE:     "#d97706",
  GEMINI:     "#2563eb",
  PERPLEXITY: "#7c3aed",
  DEEPSEEK:   "#059669",
  YANDEXGPT:  "#dc2626",
  GIGACHAT:   "#0ea5e9",
  ALISA:      "#ec4899",
  GROK:       "#6366f1",
}

const PLATFORM_LABELS: Record<string, string> = {
  CHATGPT: "ChatGPT", CLAUDE: "Claude", GEMINI: "Gemini",
  PERPLEXITY: "Perplexity", DEEPSEEK: "DeepSeek", YANDEXGPT: "YandexGPT",
  GIGACHAT: "GigaChat", ALISA: "Алиса", GROK: "Grok",
}

export function TrendsChart({ jobId, token, clientEmail, companyName }: TrendsChartProps) {
  const [points, setPoints] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [activePlatforms, setActivePlatforms] = useState<string[]>([])
  const [showOverall, setShowOverall] = useState(true)
  const [visiblePlatforms, setVisiblePlatforms] = useState<Set<string>>(new Set())

  useEffect(() => {
    const url = new URL(`/api/audit/history`, window.location.origin)
    url.searchParams.set("email", clientEmail)
    url.searchParams.set("token", token)

    fetch(url.toString())
      .then((r) => r.json())
      .then((data) => {
        if (data.points && data.points.length > 0) {
          setPoints(data.points)
          // Определяем платформы из первой точки
          const platforms = Object.keys(data.points[0].platformScores ?? {})
          setActivePlatforms(platforms)
          setVisiblePlatforms(new Set(platforms.slice(0, 4))) // показываем 4 платформы по умолчанию
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [clientEmail, token])

  if (loading) {
    return (
      <div className="py-12 text-center" style={{ color: "var(--ink-3)", fontSize: "14px" }}>
        Загрузка истории...
      </div>
    )
  }

  if (points.length < 2) {
    return (
      <div
        className="rounded-xl p-10 text-center space-y-3"
        style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
      >
        <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
          {points.length === 0 ? "Нет завершённых аудитов" : "Нужен хотя бы ещё один аудит"}
        </p>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          График динамики отображается при наличии 2+ аудитов для{" "}
          <strong>{companyName}</strong>. Запустите повторный аудит, чтобы увидеть прогресс.
        </p>
      </div>
    )
  }

  // Подготовка данных для Recharts
  const chartData = points.map((p) => {
    const date = new Date(p.createdAt)
    const label = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
    const row: Record<string, string | number> = {
      label,
      overall: p.overallScore,
    }
    for (const [platform, scores] of Object.entries(p.platformScores ?? {})) {
      row[platform] = scores.score
    }
    return row
  })

  // Toggle платформы
  function togglePlatform(p: string) {
    setVisiblePlatforms((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Platform toggles */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowOverall((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
          style={{
            background: showOverall ? "#334155" : "var(--rule)",
            color: showOverall ? "#fff" : "var(--ink-3)",
            opacity: showOverall ? 1 : 0.6,
          }}
        >
          <span className="inline-block w-3 h-0.5 rounded" style={{ background: "#334155" }} />
          Общий
        </button>
        {activePlatforms.map((p) => (
          <button
            key={p}
            onClick={() => togglePlatform(p)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity"
            style={{
              background: visiblePlatforms.has(p) ? `${PLATFORM_COLORS[p]}20` : "var(--rule)",
              color: visiblePlatforms.has(p) ? PLATFORM_COLORS[p] : "var(--ink-3)",
              border: `1px solid ${visiblePlatforms.has(p) ? PLATFORM_COLORS[p] : "transparent"}`,
            }}
          >
            {PLATFORM_LABELS[p] ?? p}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
      >
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--ink-3)" }}
              axisLine={{ stroke: "var(--rule)" }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: "var(--ink-3)" }}
              axisLine={{ stroke: "var(--rule)" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--rule)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              labelStyle={{ color: "var(--ink)", fontWeight: 600, marginBottom: "4px" }}
            />
            {showOverall && (
              <Line
                type="monotone"
                dataKey="overall"
                stroke="#334155"
                strokeWidth={2.5}
                dot={{ r: 4, fill: "#334155" }}
                activeDot={{ r: 6 }}
                name="Общий"
              />
            )}
            {activePlatforms.filter((p) => visiblePlatforms.has(p)).map((p) => (
              <Line
                key={p}
                type="monotone"
                dataKey={p}
                stroke={PLATFORM_COLORS[p] ?? "#94a3b8"}
                strokeWidth={1.5}
                dot={{ r: 3, fill: PLATFORM_COLORS[p] }}
                activeDot={{ r: 5 }}
                name={PLATFORM_LABELS[p] ?? p}
                strokeDasharray="4 2"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid var(--rule)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "var(--card)", borderBottom: "1px solid var(--rule)" }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Дата</th>
              <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Score</th>
              <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Тариф</th>
              <th className="text-center px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p, i) => {
              const prev = points[i - 1]
              const delta = prev ? p.overallScore - prev.overallScore : null
              return (
                <tr key={p.id} style={{ borderBottom: "1px solid var(--rule)" }}>
                  <td className="px-4 py-3" style={{ color: "var(--ink-2)" }}>
                    {new Date(p.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold" style={{ color: "var(--ink)" }}>
                    {p.overallScore}
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                    {p.tier}
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-sm">
                    {delta !== null ? (
                      <span style={{ color: delta > 0 ? "#059669" : delta < 0 ? "#dc2626" : "var(--ink-3)" }}>
                        {delta > 0 ? "+" : ""}{delta}
                      </span>
                    ) : (
                      <span style={{ color: "var(--ink-3)" }}>—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
