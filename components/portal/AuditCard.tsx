import Link from "next/link"

interface Props {
  jobId: string
  reportToken: string
  companyName: string
  websiteUrl: string
  score: number
  delta: number | null
  tier: string
  completedAt: Date | null
  isLatest?: boolean
}

const TIER_LABELS: Record<string, string> = {
  BASIC: "Старт",
  STANDARD: "Профи",
  ADVANCED: "Агентский",
  MONITOR_START: "Мон. Старт",
  MONITOR_PRO: "Мон. Профи",
  MONITOR_AGENT: "Мон. Агент",
}

function scoreColor(score: number) {
  if (score >= 60) return "var(--success)"
  if (score >= 30) return "var(--warn)"
  return "var(--danger)"
}

export default function AuditCard({
  jobId,
  reportToken,
  companyName,
  websiteUrl,
  score,
  delta,
  tier,
  completedAt,
  isLatest,
}: Props) {
  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—"

  return (
    <Link
      href={`/report/${jobId}?token=${reportToken}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "16px",
        padding: "16px 20px",
        borderTop: isLatest ? "none" : "1px solid var(--rule)",
        textDecoration: "none",
        color: "var(--ink)",
        background: isLatest ? "var(--bone-2)" : "var(--bone)",
        transition: "background 0.15s",
      }}
    >
      {/* Score */}
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "22px",
          fontWeight: 700,
          color: scoreColor(score),
          width: "48px",
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {score}
      </div>

      {/* Company */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            fontSize: "14px",
            color: "var(--ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {companyName}
          {isLatest && (
            <span
              style={{
                marginLeft: "8px",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                borderRadius: "3px",
                padding: "1px 6px",
                fontWeight: 700,
                letterSpacing: "0.04em",
              }}
            >
              АКТУАЛЬНЫЙ
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--ink-3)",
            marginTop: "2px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {websiteUrl}
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>
        {delta !== null && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              fontWeight: 700,
              color: delta > 0 ? "var(--success)" : delta < 0 ? "var(--danger)" : "var(--ink-3)",
              minWidth: "32px",
              textAlign: "right",
            }}
          >
            {delta > 0 ? `+${delta}` : delta === 0 ? "—" : delta}
          </span>
        )}
        <span
          style={{
            background: "var(--bone)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-sm)",
            padding: "2px 8px",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "var(--ink-3)",
            whiteSpace: "nowrap",
          }}
        >
          {TIER_LABELS[tier] ?? tier}
        </span>
        <span
          style={{
            fontSize: "12px",
            color: "var(--ink-3)",
            whiteSpace: "nowrap",
          }}
        >
          {dateStr}
        </span>
        <span style={{ fontSize: "14px", color: "var(--ink-3)" }}>→</span>
      </div>
    </Link>
  )
}
