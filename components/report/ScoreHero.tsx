"use client"

import { ScoreRing } from "./ScoreRing"

interface WeakPoint {
  id: string
  title: string
  description: string
  severity: "high" | "medium" | "low"
}

interface BrandRoleStats {
  primaryPct: number
  alternativePct: number
  mentionPct: number
  total: number
}

interface Props {
  companyName: string
  websiteUrl: string
  overallScore: number
  pdfUrl?: string | null
  reportToken?: string | null
  jobId?: string | null
  completedAt?: Date | null
  totalMentions?: number
  totalQueries?: number
  weakPoints?: WeakPoint[]
  brandRoleStats?: BrandRoleStats | null
  onGrowthPlanClick?: () => void
}

function scoreLabel(score: number) {
  if (score >= 60) return "Хорошая видимость"
  if (score >= 30) return "Средняя видимость"
  return "Низкая видимость"
}

function scoreAccent(score: number): string {
  if (score >= 60) return "var(--accent)"
  if (score >= 30) return "#f59e0b"
  return "#ef4444"
}

export function ScoreHero({
  companyName,
  websiteUrl,
  overallScore,
  pdfUrl,
  reportToken,
  jobId,
  completedAt,
  totalMentions,
  totalQueries,
  weakPoints,
  brandRoleStats,
  onGrowthPlanClick,
}: Props) {
  const date = completedAt
    ? new Date(completedAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  const topWeakPoint = weakPoints?.[0]

  const narrative = topWeakPoint
    ? `Главная точка роста: ${topWeakPoint.title.toLowerCase()}. ${topWeakPoint.description}`
    : overallScore >= 60
      ? `Бренд хорошо виден AI-ассистентам. Продолжайте поддерживать контент-стратегию.`
      : overallScore >= 30
        ? `Базовое присутствие есть, но есть серьёзные пробелы. Смотрите план роста.`
        : `Бренд почти не упоминается в AI. В плане роста — приоритетные шаги.`

  return (
    <div
      style={{
        borderBottom: "1px solid var(--rule)",
        background: "var(--bone)",
      }}
    >
      <div
        className="score-hero-grid max-w-5xl mx-auto px-6 py-10"
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: "40px",
          alignItems: "center",
        }}
      >
        {/* Left — score */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <p className="t-eyebrow" style={{ marginBottom: "4px" }}>
            KaliGEO AI Audit
          </p>

          <ScoreRing score={overallScore} size={136} strokeWidth={10} animated />

          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: scoreAccent(overallScore),
              margin: 0,
            }}
          >
            {scoreLabel(overallScore)}
          </p>

          {totalMentions !== undefined && totalQueries !== undefined && totalQueries > 0 && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--ink-3)",
                fontFamily: "var(--font-mono)",
                margin: 0,
              }}
            >
              {totalMentions} / {totalQueries} запросов
            </p>
          )}

          {date && (
            <p style={{ fontSize: "11px", color: "var(--ink-3)", margin: 0 }}>{date}</p>
          )}
        </div>

        {/* Right — narrative */}
        <div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(22px, 3vw, 30px)",
              fontWeight: 400,
              margin: "0 0 4px",
              lineHeight: 1.2,
              color: "var(--ink)",
            }}
          >
            {companyName}
          </h1>
          <p style={{ fontSize: "13px", color: "var(--ink-3)", margin: "0 0 16px" }}>
            {websiteUrl}
          </p>

          <p
            style={{
              fontSize: "14px",
              color: "var(--ink-2)",
              lineHeight: 1.65,
              margin: "0 0 20px",
              maxWidth: "480px",
            }}
          >
            {narrative}
          </p>

          {/* Brand role stats */}
          {brandRoleStats && brandRoleStats.total > 0 && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginBottom: "16px",
              }}
            >
              {brandRoleStats.primaryPct > 0 && (
                <RoleBadge
                  label="Топ-рекомендация"
                  pct={brandRoleStats.primaryPct}
                  color="#166534"
                  bg="#dcfce7"
                />
              )}
              {brandRoleStats.alternativePct > 0 && (
                <RoleBadge
                  label="Альтернатива"
                  pct={brandRoleStats.alternativePct}
                  color="#854d0e"
                  bg="#fef9c3"
                />
              )}
              {brandRoleStats.mentionPct > 0 && (
                <RoleBadge
                  label="Упоминание"
                  pct={brandRoleStats.mentionPct}
                  color="#374151"
                  bg="#f3f4f6"
                />
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {onGrowthPlanClick && (
              <button
                onClick={onGrowthPlanClick}
                style={{
                  padding: "10px 18px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent)",
                  color: "var(--accent-ink)",
                  border: "none",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                К плану роста →
              </button>
            )}
            {pdfUrl && (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "10px 18px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bone-2)",
                  color: "var(--ink-2)",
                  border: "1px solid var(--rule)",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Скачать PDF
              </a>
            )}
            {jobId && reportToken && (
              <a
                href={`/api/report/${jobId}/download-html?token=${reportToken}`}
                download
                style={{
                  padding: "10px 18px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bone-2)",
                  color: "var(--ink-2)",
                  border: "1px solid var(--rule)",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Скачать HTML
              </a>
            )}
            {jobId && reportToken && (
              <a
                href={`/api/report/${jobId}/download-pptx?token=${reportToken}`}
                download
                style={{
                  padding: "10px 18px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bone-2)",
                  color: "var(--ink-2)",
                  border: "1px solid var(--rule)",
                  fontSize: "13px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                Скачать PPTX
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Mobile: stack columns */}
      <style>{`
        @media (max-width: 640px) {
          .score-hero-grid {
            grid-template-columns: 1fr !important;
            justify-items: center;
            text-align: center;
          }
        }
      `}</style>
    </div>
  )
}

function RoleBadge({ label, pct, color, bg }: { label: string; pct: number; color: string; bg: string }) {
  if (!label) return null
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        fontWeight: 600,
        color,
        background: bg,
        border: `1px solid ${color}22`,
        borderRadius: "4px",
        padding: "3px 8px",
        letterSpacing: "0.02em",
      }}
    >
      {label}
      <span style={{ opacity: 0.7, fontWeight: 400 }}>{pct}%</span>
    </span>
  )
}
