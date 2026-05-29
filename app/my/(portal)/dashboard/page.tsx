import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"
import CommandHero from "@/components/portal/CommandHero"
import MetricPill from "@/components/portal/MetricPill"
import AuditCard from "@/components/portal/AuditCard"
import PlatformCoverageGrid from "@/components/portal/PlatformCoverageGrid"
import QuickActions from "@/components/portal/QuickActions"
import TrialForm from "@/components/portal/TrialForm"

export const metadata: Metadata = {
  title: "Личный кабинет — KaliGEO",
}

export default async function DashboardPage() {
  const clientId = await getClientSession()
  if (!clientId) redirect("/my/login")

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { companyName: true, email: true },
  })

  const jobs = await prisma.auditJob.findMany({
    where: { clientId, status: "COMPLETED" },
    include: {
      report: {
        select: {
          overallScore: true,
          visibilityScores: true,
          weakPoints: true,
        },
      },
    },
    orderBy: { completedAt: "desc" },
    take: 10,
  })

  const latestJob = jobs[0]
  const previousJob = jobs[1]
  const latestReport = latestJob?.report
  const latestScore = latestReport?.overallScore ?? null
  const previousScore = previousJob?.report?.overallScore ?? null
  const delta = latestScore !== null && previousScore !== null ? latestScore - previousScore : null

  // Compute metrics from latest report
  type VisScore = { score: number; mentionCount: number; totalQueries: number; sentiment?: string }
  const visScores = latestReport?.visibilityScores
    ? (latestReport.visibilityScores as Record<string, VisScore>)
    : null

  const sentimentScore = visScores
    ? Math.round(
        Object.values(visScores).reduce((sum, s) => sum + s.score, 0) /
          Math.max(1, Object.keys(visScores).length)
      )
    : null

  const platformCount = latestJob?.selectedPlatforms?.length ?? 0
  const coveredCount = visScores
    ? Object.values(visScores).filter((s) => s.mentionCount > 0).length
    : 0

  const today = new Date().toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            — Добро пожаловать
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
            {client?.companyName ?? "Личный кабинет"}
          </h1>
        </div>
        <span style={{ fontSize: "12px", color: "var(--ink-3)", flexShrink: 0 }}>{today}</span>
      </div>

      {/* CommandHero or empty state */}
      {latestJob && latestScore !== null ? (
        <CommandHero
          score={latestScore}
          delta={delta}
          jobId={latestJob.id}
          reportToken={latestJob.reportToken}
          companyName={latestJob.companyName}
          weakPoints={latestReport?.weakPoints as { title: string; description: string }[] | null}
        />
      ) : (
        <EmptyHero />
      )}

      {/* Metric pills — only when there's data */}
      {latestJob && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          <MetricPill
            label="Платформы охвачены"
            value={`${coveredCount}/${platformCount}`}
            sub={coveredCount < platformCount ? `${platformCount - coveredCount} пробела` : "Все активны"}
            accent={coveredCount === platformCount}
          />
          <MetricPill
            label="Средний скор"
            value={latestScore !== null ? `${latestScore}` : "—"}
            sub={delta !== null ? (delta > 0 ? `↑ +${delta} за аудит` : `↓ ${delta} за аудит`) : "Первый аудит"}
            accent={latestScore !== null && latestScore >= 60}
          />
          {sentimentScore !== null && (
            <MetricPill
              label="Тональность"
              value={sentimentScore >= 60 ? "Позитив" : sentimentScore >= 30 ? "Нейтраль" : "Негатив"}
              sub={`Ср. скор: ${sentimentScore}`}
              accent={sentimentScore >= 60}
            />
          )}
          <MetricPill
            label="Аудитов всего"
            value={`${jobs.length}`}
            sub={jobs.length > 1 ? "Сравнение доступно" : "Следующий покажет динамику"}
          />
        </div>
      )}

      {/* Platform coverage */}
      {latestJob && (
        <section>
          <SectionTitle>Охват платформ</SectionTitle>
          <PlatformCoverageGrid
            selectedPlatforms={latestJob.selectedPlatforms}
            coveredPlatforms={
              visScores
                ? Object.entries(visScores)
                    .filter(([, s]) => s.mentionCount > 0)
                    .map(([k]) => k)
                : []
            }
          />
        </section>
      )}

      {/* Audit list */}
      {jobs.length > 0 && (
        <section>
          <SectionTitle>Мои аудиты</SectionTitle>
          <div
            style={{
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--rule)",
              overflow: "hidden",
            }}
          >
            {jobs.map((job, i) => {
              const score = job.report?.overallScore ?? 0
              const prevScore = jobs[i + 1]?.report?.overallScore ?? null
              const d = prevScore !== null ? score - prevScore : null
              return (
                <AuditCard
                  key={job.id}
                  jobId={job.id}
                  reportToken={job.reportToken}
                  companyName={job.companyName}
                  websiteUrl={job.websiteUrl}
                  score={score}
                  delta={d}
                  tier={job.tier}
                  completedAt={job.completedAt}
                  isLatest={i === 0}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <QuickActions hasAudits={jobs.length > 0} clientEmail={client?.email ?? ""} />
    </div>
  )
}

function EmptyHero() {
  return (
    <div
      style={{
        background: "var(--bone-2)",
        borderRadius: "var(--radius-lg)",
        padding: "52px 32px",
        textAlign: "center",
        border: "1px dashed var(--rule)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
      }}
    >
      <div>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "22px",
            fontWeight: 400,
            margin: "0 0 8px",
            color: "var(--ink)",
          }}
        >
          Аудитов ещё нет
        </p>
        <p style={{ fontSize: "14px", color: "var(--ink-3)", margin: 0 }}>
          Запустите первый бесплатный аудит или выберите тариф — результат за 8–10 минут.
        </p>
      </div>

      {/* Trial form */}
      <TrialForm />

      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
        <a
          href="/pricing"
          style={{
            display: "inline-block",
            background: "transparent",
            color: "var(--ink-2)",
            borderRadius: "var(--radius-md)",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 500,
            textDecoration: "none",
            border: "1px solid var(--rule)",
          }}
        >
          Выбрать тариф
        </a>
        <a
          href="/tools/domain-check"
          style={{
            display: "inline-block",
            background: "transparent",
            color: "var(--ink-2)",
            borderRadius: "var(--radius-md)",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: 500,
            textDecoration: "none",
            border: "1px solid var(--rule)",
          }}
        >
          Бесплатная проверка домена
        </a>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ink-3)",
        margin: "0 0 12px",
      }}
    >
      — {children}
    </h2>
  )
}
