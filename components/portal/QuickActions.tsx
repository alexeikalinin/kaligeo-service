import Link from "next/link"

interface Props {
  hasAudits: boolean
  clientEmail: string
}

export default function QuickActions({ hasAudits }: Props) {
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
        paddingTop: "4px",
      }}
    >
      <QuickBtn href="/tools/domain-check" label="Проверить домен" variant="secondary" />
      {hasAudits && (
        <QuickBtn href="/my/dashboard" label="Сравнить аудиты" variant="secondary" />
      )}
    </div>
  )
}

function QuickBtn({
  href,
  label,
  variant,
}: {
  href: string
  label: string
  variant: "primary" | "secondary"
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "9px 16px",
        borderRadius: "var(--radius-md)",
        background: variant === "primary" ? "var(--accent)" : "var(--bone-2)",
        color: variant === "primary" ? "var(--accent-ink)" : "var(--ink-2)",
        border: "1px solid var(--rule)",
        fontSize: "13px",
        fontWeight: 500,
        textDecoration: "none",
        transition: "all 0.15s",
      }}
    >
      {label}
    </Link>
  )
}
