interface Props {
  label: string
  value: string
  sub?: string
  accent?: boolean
}

export default function MetricPill({ label, value, sub, accent }: Props) {
  return (
    <div
      style={{
        background: accent ? "var(--accent)" : "var(--bone-2)",
        border: `1px solid ${accent ? "transparent" : "var(--rule)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "10px",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: accent ? "rgba(15,17,21,0.55)" : "var(--ink-3)",
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "24px",
          fontWeight: 700,
          color: accent ? "var(--accent-ink)" : "var(--ink)",
          margin: 0,
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          style={{
            fontSize: "12px",
            color: accent ? "rgba(15,17,21,0.55)" : "var(--ink-3)",
            margin: 0,
          }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}
