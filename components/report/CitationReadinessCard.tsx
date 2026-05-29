"use client"

interface SubScore {
  label: string
  value: number
  description: string
}

interface CitationReadinessCardProps {
  score: number
  contextual: number
  structural: number
  referential: number
  signals: string[]
  capApplied?: boolean
}

function Ring({ value, size = 56 }: { value: number; size?: number }) {
  const r = size / 2 - 5
  const circ = 2 * Math.PI * r
  const dash = (value / 100) * circ
  const color = value >= 60 ? "var(--lime, #84cc16)" : value >= 30 ? "#f59e0b" : "#ef4444"
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule, #e5e7eb)" strokeWidth="4" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x={size / 2} y={size / 2 + 5}
        textAnchor="middle"
        style={{ fontSize: "13px", fontWeight: "700", fill: color, fontFamily: "var(--font-mono, monospace)" }}
      >
        {value}
      </text>
    </svg>
  )
}

function Bar({ value }: { value: number }) {
  const color = value >= 60 ? "var(--lime, #84cc16)" : value >= 30 ? "#f59e0b" : "#ef4444"
  return (
    <div style={{ height: "6px", background: "var(--rule, #e5e7eb)", borderRadius: "99px", overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${value}%`, background: color, height: "100%", borderRadius: "99px", transition: "width .6s ease" }} />
    </div>
  )
}

export function CitationReadinessCard({
  score, contextual, structural, referential, signals, capApplied,
}: CitationReadinessCardProps) {
  const subScores: SubScore[] = [
    {
      label: "Контентная ясность",
      value: contextual,
      description: "Насколько AI понимает кто вы — standalone definition, FAQ, «ответ сначала»",
    },
    {
      label: "Структура для AI",
      value: structural,
      description: "Schema.org, llms.txt, доступность для AI-краулеров",
    },
    {
      label: "Авторитет источников",
      value: referential,
      description: "Качество источников, цитирование вашего сайта, упоминания в медиа",
    },
  ]

  const color = score >= 60 ? "var(--lime, #84cc16)" : score >= 30 ? "#f59e0b" : "#ef4444"

  return (
    <div
      style={{
        border: "1px solid var(--rule, #e5e7eb)",
        borderRadius: "var(--radius-lg, 12px)",
        padding: "24px",
        background: "var(--bone-2, #f9fafb)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "20px" }}>
        <div>
          <p style={{ margin: "0 0 2px", fontSize: "11px", color: "var(--ink-3, #9ca3af)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".08em" }}>
            — Готовность к цитированию AI
          </p>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--ink, #111827)", letterSpacing: "-0.01em" }}>
            Citation Readiness Score
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: "13px", color: "var(--ink-3, #6b7280)" }}>
            Насколько ваш контент готов к тому, чтобы AI его цитировал
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Ring value={score} size={68} />
          <div>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: 700, lineHeight: 1, color, fontFamily: "var(--font-serif)" }}>{score}</p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-3, #9ca3af)" }}>/100</p>
          </div>
        </div>
      </div>

      {capApplied && (
        <div style={{ marginBottom: "16px", padding: "10px 14px", borderRadius: "8px", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.2)", fontSize: "13px", color: "#dc2626" }}>
          ⚠ Применён cap: нет упоминаний ни на одной платформе — максимум 25/100
        </div>
      )}

      {/* Sub-scores */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: signals.length > 0 ? "20px" : 0 }}>
        {subScores.map((s) => (
          <div key={s.label}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink, #111827)", width: "160px", flexShrink: 0 }}>{s.label}</span>
              <Bar value={s.value} />
              <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--ink-2, #374151)", width: "32px", textAlign: "right", flexShrink: 0 }}>{s.value}</span>
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--ink-3, #9ca3af)", paddingLeft: "172px", lineHeight: 1.4 }}>{s.description}</p>
          </div>
        ))}
      </div>

      {/* Top signals */}
      {signals.length > 0 && (
        <div style={{ borderTop: "1px solid var(--rule, #e5e7eb)", paddingTop: "14px" }}>
          <p style={{ margin: "0 0 8px", fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".07em" }}>
            Что снижает score
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {signals.slice(0, 5).map((s) => (
              <span
                key={s}
                style={{ fontSize: "12px", padding: "3px 9px", borderRadius: "999px", background: "var(--bone, #f3f4f6)", border: "1px solid var(--rule)", color: "var(--ink-2)" }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
