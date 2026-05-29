"use client"

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"

interface DataPoint {
  date: string
  score: number
  company: string
}

interface Props {
  data: DataPoint[]
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: DataPoint; value: number }[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div
      style={{
        background: "var(--bone)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-md)",
        padding: "10px 14px",
        fontSize: "13px",
        color: "var(--ink)",
        fontFamily: "var(--font-mono)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: "18px", color: scoreColor(d.score) }}>{d.score}</div>
      <div style={{ color: "var(--ink-3)", fontSize: "11px", marginTop: "2px" }}>{d.company}</div>
      <div style={{ color: "var(--ink-3)", fontSize: "11px" }}>{d.date}</div>
    </div>
  )
}

function scoreColor(score: number) {
  if (score >= 60) return "var(--success)"
  if (score >= 30) return "var(--warn)"
  return "var(--danger)"
}

export default function ScoreTrendChart({ data }: Props) {
  if (data.length < 2) {
    return (
      <div
        style={{
          height: "180px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--ink-3)",
          fontSize: "13px",
          fontFamily: "var(--font-mono)",
          border: "1px dashed var(--rule)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        Нужно минимум 2 аудита для отображения тренда
      </div>
    )
  }

  const avg = Math.round(data.reduce((s, d) => s + d.score, 0) / data.length)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--ink-3)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--ink-3)" }}
          axisLine={false}
          tickLine={false}
        />
        <ReferenceLine y={avg} stroke="var(--rule)" strokeDasharray="4 4" />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#a3e635"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#a3e635", strokeWidth: 0 }}
          activeDot={{ r: 6, fill: "#a3e635", strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
