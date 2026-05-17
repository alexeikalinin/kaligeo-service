"use client"

interface Props {
  companyName: string
  websiteUrl: string
  overallScore: number
  pdfUrl?: string | null
  completedAt?: Date | null
  totalMentions?: number
  totalQueries?: number
}

function scoreAccent(score: number): string {
  if (score >= 60) return "var(--accent)"
  if (score >= 30) return "#f59e0b"
  return "#ef4444"
}

function scoreLabel(score: number) {
  if (score >= 60) return "Хорошая видимость"
  if (score >= 30) return "Средняя видимость"
  return "Низкая видимость"
}

function ScoreRing({ score }: { score: number }) {
  const r = 56
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const color = scoreAccent(score)

  return (
    <svg width="136" height="136" viewBox="0 0 136 136">
      <circle cx="68" cy="68" r={r} fill="none" stroke="var(--rule)" strokeWidth="10" />
      <circle
        cx="68"
        cy="68"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 68 68)"
      />
      <text
        x="68"
        y="76"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-mono)", fontSize: "30px", fontWeight: "bold", fill: color }}
      >
        {score}
      </text>
    </svg>
  )
}

export function ScoreHero({ companyName, websiteUrl, overallScore, pdfUrl, completedAt, totalMentions, totalQueries }: Props) {
  const date = completedAt
    ? new Date(completedAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <div
      className="flex flex-col items-center py-14 px-6 text-center border-b"
      style={{ borderColor: "var(--rule)", background: "var(--bone)" }}
    >
      <p className="t-eyebrow mb-6">KaliGEO AI Audit</p>
      <h1
        className="text-4xl font-bold mb-1"
        style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
      >
        {companyName}
      </h1>
      <p className="text-sm mb-10" style={{ color: "var(--ink-3)" }}>
        {websiteUrl}
      </p>

      <ScoreRing score={overallScore} />

      <p className="text-sm font-semibold mt-4 mb-1" style={{ color: scoreAccent(overallScore) }}>
        {scoreLabel(overallScore)}
      </p>
      {totalMentions !== undefined && totalQueries !== undefined && totalQueries > 0 && (
        <p className="text-xs mt-1 mb-1" style={{ color: "var(--ink-2)" }}>
          Упоминаетесь в{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: scoreAccent(overallScore) }}>
            {totalMentions}
          </span>{" "}
          из{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>
            {totalQueries}
          </span>{" "}
          запросов
        </p>
      )}
      {date && (
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          {date}
        </p>
      )}

      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 px-5 py-2.5 rounded text-sm font-medium transition-opacity hover:opacity-70"
          style={{ background: "var(--ink)", color: "var(--bone)" }}
        >
          Скачать PDF
        </a>
      )}
    </div>
  )
}
