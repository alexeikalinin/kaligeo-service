"use client"

import { useState } from "react"
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

interface CompetitorEntry {
  name: string
  platforms: string[]
  mentionCount: number
}

interface Props {
  matrix: CompetitorEntry[]
  companyName: string
  brandMentionCount?: number
  brandPlatformCount?: number
}

const PLATFORM_SHORT: Record<string, string> = {
  CHATGPT: "GPT",
  CLAUDE: "Claude",
  GEMINI: "Gemini",
  PERPLEXITY: "Perp.",
  DEEPSEEK: "DS",
  YANDEXGPT: "YGPT",
  GIGACHAT: "GC",
  ALISA: "Alisa",
  GROK: "Grok",
}

type SortKey = "name" | "mentionCount"
type ViewMode = "table" | "bubble"

interface BubblePoint {
  name: string
  x: number // кол-во платформ
  y: number // упоминания
  isBrand: boolean
}

function BubbleChart({ data, companyName }: { data: BubblePoint[]; companyName: string }) {
  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <ScatterChart margin={{ top: 16, right: 24, bottom: 16, left: 0 }}>
          <XAxis
            type="number"
            dataKey="x"
            name="Платформы"
            label={{ value: "Платформы", position: "insideBottom", offset: -8, style: { fill: "var(--ink-3)", fontSize: 11 } }}
            tick={{ fontSize: 11, fill: "var(--ink-3)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--rule)" }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Упоминания"
            label={{ value: "Упоминания", angle: -90, position: "insideLeft", style: { fill: "var(--ink-3)", fontSize: 11 } }}
            tick={{ fontSize: 11, fill: "var(--ink-3)" }}
            tickLine={false}
            axisLine={{ stroke: "var(--rule)" }}
            width={48}
          />
          <Tooltip
            cursor={false}
            content={({ payload }) => {
              if (!payload?.length) return null
              const d = payload[0].payload as BubblePoint
              return (
                <div
                  style={{
                    background: "var(--ink)",
                    border: "1px solid var(--rule)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12px",
                    color: "var(--bone)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <p style={{ fontWeight: 700, marginBottom: "4px" }}>{d.name}</p>
                  <p style={{ color: "var(--bone-2)" }}>{d.y} упоминаний · {d.x} платформ</p>
                </div>
              )
            }}
          />
          <Scatter data={data} isAnimationActive={false}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.isBrand ? "var(--accent)" : "rgba(100,105,120,0.35)"}
                stroke={entry.isBrand ? "var(--accent)" : "var(--ink-3)"}
                strokeWidth={entry.isBrand ? 2 : 1}
              />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-2" style={{ fontSize: "11px", color: "var(--ink-3)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }} />
          {companyName}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "rgba(100,105,120,0.35)", border: "1px solid var(--ink-3)" }} />
          Конкуренты
        </span>
      </div>
    </div>
  )
}

export function CompetitorMatrixTable({
  matrix,
  companyName,
  brandMentionCount = 0,
  brandPlatformCount = 0,
}: Props) {
  const [sort, setSort] = useState<SortKey>("mentionCount")
  const [view, setView] = useState<ViewMode>("table")

  const sorted = [...matrix].sort((a, b) =>
    sort === "mentionCount" ? b.mentionCount - a.mentionCount : a.name.localeCompare(b.name)
  )

  if (matrix.length === 0) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: "var(--ink-3)" }}>
        Конкуренты не были указаны при запуске аудита
      </p>
    )
  }

  const bubbleData: BubblePoint[] = [
    { name: companyName, x: brandPlatformCount, y: brandMentionCount, isBrand: true },
    ...matrix.map((c) => ({
      name: c.name,
      x: c.platforms.length,
      y: c.mentionCount,
      isBrand: false,
    })),
  ]

  return (
    <div>
      {/* View toggle */}
      <div className="flex gap-2 mb-4">
        {(["table", "bubble"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className="px-3 py-1 rounded text-xs font-medium transition-colors"
            style={
              view === mode
                ? { background: "var(--ink)", color: "var(--bone)" }
                : { background: "var(--bone-2)", color: "var(--ink-2)", border: "1px solid var(--rule)" }
            }
          >
            {mode === "table" ? "Таблица" : "Пузырьки"}
          </button>
        ))}
        {view === "table" && (
          <>
            <div style={{ width: "1px", background: "var(--rule)", margin: "0 4px" }} />
            {(["mentionCount", "name"] as SortKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setSort(key)}
                className="px-3 py-1 rounded text-xs font-medium transition-colors"
                style={
                  sort === key
                    ? { background: "var(--ink)", color: "var(--bone)" }
                    : { background: "var(--bone-2)", color: "var(--ink-2)", border: "1px solid var(--rule)" }
                }
              >
                {key === "mentionCount" ? "По упоминаниям" : "По имени"}
              </button>
            ))}
          </>
        )}
      </div>

      {view === "bubble" ? (
        <BubbleChart data={bubbleData} companyName={companyName} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-xs border-b"
                style={{ borderColor: "var(--rule)", color: "var(--ink-3)" }}
              >
                <th className="pb-3 pr-4 font-medium">Конкурент</th>
                <th className="pb-3 pr-4 font-medium">Упоминаний</th>
                <th className="pb-3 font-medium">Платформы</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr
                  key={c.name}
                  className="border-b hover:bg-[var(--bone-2)] transition-colors"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <td className="py-3 pr-4 font-medium" style={{ color: "var(--ink)" }}>
                    {c.name}
                  </td>
                  <td className="py-3 pr-4" style={{ color: "var(--ink-2)" }}>
                    <span className="font-mono">{c.mentionCount}</span>
                  </td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.platforms.map((p) => (
                        <span key={p} className="monotag">
                          {PLATFORM_SHORT[p] ?? p}
                        </span>
                      ))}
                      {c.platforms.length === 0 && (
                        <span style={{ color: "var(--ink-3)" }} className="text-xs">
                          —
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs mt-3" style={{ color: "var(--ink-3)" }}>
            vs. {companyName}
          </p>
        </div>
      )}
    </div>
  )
}
