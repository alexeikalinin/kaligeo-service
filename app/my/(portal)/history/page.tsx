import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"
import AuditCard from "@/components/portal/AuditCard"
import ScoreTrendChart from "@/components/portal/ScoreTrendChart"

export const metadata: Metadata = {
  title: "История аудитов — KaliGEO",
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

export default async function HistoryPage() {
  const clientId = await getClientSession()
  if (!clientId) redirect("/my/login")

  const jobs = await prisma.auditJob.findMany({
    where: { clientId, status: "COMPLETED" },
    include: {
      report: { select: { overallScore: true } },
    },
    orderBy: { completedAt: "asc" },
  })

  if (jobs.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
        <SectionTitle>История аудитов</SectionTitle>
        <div
          style={{
            background: "var(--bone-2)",
            borderRadius: "var(--radius-lg)",
            padding: "52px 32px",
            textAlign: "center",
            border: "1px dashed var(--rule)",
          }}
        >
          <p style={{ fontFamily: "var(--font-serif)", fontSize: "22px", fontWeight: 400, margin: "0 0 8px", color: "var(--ink)" }}>
            Аудитов ещё нет
          </p>
          <p style={{ fontSize: "14px", color: "var(--ink-3)", margin: "0 0 24px" }}>
            После первого аудита здесь появится история и динамика вашего AI-скора.
          </p>
          <a
            href="/pricing"
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: "var(--radius-md)",
              padding: "11px 22px",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Заказать аудит →
          </a>
        </div>
      </div>
    )
  }

  // Chart data (chronological)
  const chartData = jobs.map((job) => ({
    date: job.completedAt
      ? new Date(job.completedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
      : "—",
    score: job.report?.overallScore ?? 0,
    company: job.companyName,
  }))

  // Stats
  const scores = jobs.map((j) => j.report?.overallScore ?? 0)
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const bestScore = Math.max(...scores)
  const latestScore = scores[scores.length - 1]
  const firstScore = scores[0]
  const totalDelta = latestScore - firstScore

  // Reverse for display (newest first)
  const jobsDesc = [...jobs].reverse()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            — Личный кабинет
          </p>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(22px, 4vw, 30px)",
              fontWeight: 400,
              margin: "4px 0 0",
              color: "var(--ink)",
            }}
          >
            История аудитов
          </h1>
        </div>
        <span style={{ fontSize: "12px", color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
          {jobs.length} {jobs.length === 1 ? "аудит" : jobs.length < 5 ? "аудита" : "аудитов"}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" }}>
        <StatCard label="Всего аудитов" value={String(jobs.length)} />
        <StatCard label="Средний скор" value={String(avgScore)} color={scoreColor(avgScore)} />
        <StatCard label="Лучший скор" value={String(bestScore)} color={scoreColor(bestScore)} />
        <StatCard
          label="Рост за период"
          value={totalDelta > 0 ? `+${totalDelta}` : String(totalDelta)}
          color={totalDelta > 0 ? "var(--success)" : totalDelta < 0 ? "var(--danger)" : "var(--ink-3)"}
        />
      </div>

      {/* Trend chart */}
      <section>
        <SectionTitle>Динамика AI-скора</SectionTitle>
        <div
          style={{
            background: "var(--bone-2)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 20px 12px",
          }}
        >
          <ScoreTrendChart data={chartData} />
        </div>
      </section>

      {/* Audit list */}
      <section>
        <SectionTitle>Все аудиты</SectionTitle>
        <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--rule)", overflow: "hidden" }}>
          {jobsDesc.map((job, i) => {
            const score = job.report?.overallScore ?? 0
            const prevJob = jobsDesc[i + 1]
            const prevScore = prevJob?.report?.overallScore ?? null
            const delta = prevScore !== null ? score - prevScore : null
            return (
              <AuditCard
                key={job.id}
                jobId={job.id}
                reportToken={job.reportToken}
                companyName={job.companyName}
                websiteUrl={job.websiteUrl}
                score={score}
                delta={delta}
                tier={job.tier}
                completedAt={job.completedAt}
                isLatest={i === 0}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      style={{
        background: "var(--bone-2)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-lg)",
        padding: "16px 18px",
      }}
    >
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 4px" }}>
        {label}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "24px", fontWeight: 700, color: color ?? "var(--ink)", margin: 0, lineHeight: 1.1 }}>
        {value}
      </p>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 12px" }}>
      — {children}
    </h2>
  )
}
