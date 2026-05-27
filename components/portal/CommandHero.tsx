import Link from "next/link"

interface Props {
  score: number
  delta: number | null
  jobId: string
  reportToken: string
  companyName: string
  weakPoints: { title: string; description: string }[] | null
}

function scoreColor(score: number) {
  if (score >= 60) return "#22c55e"
  if (score >= 30) return "#f59e0b"
  return "#ef4444"
}

export default function CommandHero({
  score,
  delta,
  jobId,
  reportToken,
  companyName,
  weakPoints,
}: Props) {
  const isGood = score >= 60
  const bg = isGood ? "var(--accent)" : "var(--bone-2)"
  const textColor = isGood ? "var(--accent-ink)" : "var(--ink)"
  const mutedColor = isGood ? "rgba(15,17,21,0.55)" : "var(--ink-3)"
  const borderColor = isGood ? "transparent" : "var(--rule)"

  const topWeak = weakPoints?.[0]
  const narrative = topWeak
    ? `Главный пробел: ${topWeak.title.toLowerCase()}.`
    : isGood
      ? "Бренд хорошо виден AI-ассистентам. Продолжайте стратегию."
      : score >= 30
        ? "Базовое присутствие есть, но есть серьёзные пробелы."
        : "Бренд почти не упоминается в AI. Смотрите план роста."

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-lg)",
        padding: "28px 32px",
        display: "flex",
        alignItems: "center",
        gap: "28px",
        flexWrap: "wrap",
      }}
    >
      {/* Score */}
      <div style={{ flexShrink: 0, minWidth: "80px" }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "60px",
            fontWeight: 700,
            lineHeight: 1,
            color: textColor,
          }}
        >
          {score}
        </div>
        <div style={{ fontSize: "12px", color: mutedColor, marginTop: "2px" }}>/100 · AI Score</div>
        {delta !== null && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              fontWeight: 700,
              marginTop: "6px",
              color: delta > 0 ? (isGood ? "#0a3d1a" : "var(--success)") : "var(--danger)",
            }}
          >
            {delta > 0 ? `↑ +${delta}` : `↓ ${delta}`} с прошлого аудита
          </div>
        )}
      </div>

      {/* Divider */}
      <div
        style={{
          width: "1px",
          alignSelf: "stretch",
          background: isGood ? "rgba(15,17,21,0.15)" : "var(--rule)",
          flexShrink: 0,
        }}
      />

      {/* Narrative */}
      <div style={{ flex: 1, minWidth: "200px" }}>
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: mutedColor,
            margin: "0 0 6px",
          }}
        >
          {companyName}
        </p>
        <p
          style={{
            fontSize: "15px",
            color: textColor,
            lineHeight: 1.55,
            margin: "0 0 16px",
            fontWeight: 500,
          }}
        >
          {narrative}
          {topWeak && (
            <span style={{ display: "block", marginTop: "4px", fontSize: "13px", fontWeight: 400, color: mutedColor }}>
              {topWeak.description.slice(0, 120)}
              {topWeak.description.length > 120 ? "..." : ""}
            </span>
          )}
        </p>
        <Link
          href={`/report/${jobId}?token=${reportToken}`}
          style={{
            display: "inline-block",
            background: isGood ? "var(--accent-ink)" : "var(--ink)",
            color: isGood ? "var(--accent)" : "var(--bone)",
            borderRadius: "var(--radius-md)",
            padding: "9px 18px",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Открыть отчёт →
        </Link>
      </div>
    </div>
  )
}
