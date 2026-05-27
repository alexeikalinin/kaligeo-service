import { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"
import { SourcesAnalysis } from "@/components/report/SourcesAnalysis"

export const metadata: Metadata = {
  title: "Источники — KaliGEO",
}

interface SourcesReport {
  topDomains: { domain: string; count: number; category: string }[]
  byCategory: Record<string, { urls: string[]; count: number }>
  totalSources: number
  competitorSourceAdvantage: { competitor: string; uniqueDomains: string[]; count: number }[]
}

export default async function SourcesPage() {
  const clientId = await getClientSession()
  if (!clientId) redirect("/my/login")

  // Get the latest STANDARD+ job with a sourcesReport
  const job = await prisma.auditJob.findFirst({
    where: {
      clientId,
      status: "COMPLETED",
      tier: { in: ["STANDARD", "ADVANCED", "MONITOR_PRO", "MONITOR_AGENT"] },
    },
    include: {
      report: {
        select: {
          sourcesReport: true,
          overallScore: true,
        },
      },
    },
    orderBy: { completedAt: "desc" },
  })

  const sourcesReport = job?.report?.sourcesReport as SourcesReport | null

  if (!sourcesReport || sourcesReport.totalSources === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Link
            href="/my/dashboard"
            style={{ fontSize: "13px", color: "var(--ink-3)", textDecoration: "none" }}
          >
            ← Дашборд
          </Link>
          <h1
            className="mt-4 text-2xl font-bold"
            style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
          >
            Источники
          </h1>
        </div>
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
        >
          <p style={{ color: "var(--ink-3)", fontSize: "14px" }}>
            Нет данных об источниках. Запустите аудит уровня Профи или выше.
          </p>
          <Link
            href="/my/dashboard"
            style={{
              display: "inline-block",
              marginTop: "16px",
              padding: "10px 20px",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: "var(--radius-md)",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Запустить аудит →
          </Link>
        </div>
      </div>
    )
  }

  // Compute gaps: domains competitor has but brand doesn't
  const brandDomains = new Set(sourcesReport.topDomains.map((d) => d.domain))
  const gaps: { competitor: string; domain: string }[] = []
  for (const ca of sourcesReport.competitorSourceAdvantage ?? []) {
    for (const d of ca.uniqueDomains) {
      if (!brandDomains.has(d)) {
        gaps.push({ competitor: ca.competitor, domain: d })
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/my/dashboard"
          style={{ fontSize: "13px", color: "var(--ink-3)", textDecoration: "none" }}
        >
          ← Дашборд
        </Link>
        <div className="flex items-baseline gap-4 mt-4">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
          >
            Источники
          </h1>
          <span style={{ fontSize: "13px", color: "var(--ink-3)" }}>
            {sourcesReport.totalSources} упоминаний
          </span>
        </div>
        <p className="mt-1" style={{ fontSize: "14px", color: "var(--ink-3)" }}>
          Сайты, которые AI-платформы цитируют при ответах о вашем бренде
        </p>
      </div>

      {/* Main sources analysis */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <SourcesAnalysis sourcesReport={sourcesReport as any} />

      {/* Citation Heatmap */}
      {sourcesReport.byCategory && (
        <div className="mt-10">
          <h2 className="text-base font-bold mb-4" style={{ color: "var(--ink)" }}>
            Карта цитирований по типам
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.entries(sourcesReport.byCategory) as [string, { urls: string[]; count: number }][])
              .filter(([, v]) => v.count > 0)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([cat, data]) => {
                const pct = Math.round((data.count / sourcesReport.totalSources) * 100)
                return (
                  <div
                    key={cat}
                    className="rounded-lg px-4 py-3"
                    style={{ border: "1px solid var(--rule)", background: "var(--bone)" }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: "var(--ink)" }}>
                        {cat}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          color: "var(--ink-3)",
                        }}
                      >
                        {data.count} · {pct}%
                      </span>
                    </div>
                    <div
                      style={{
                        height: "4px",
                        background: "var(--bone-2)",
                        borderRadius: "2px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${pct}%`,
                          background: "var(--accent)",
                          borderRadius: "2px",
                        }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Gaps section */}
      {gaps.length > 0 && (
        <div className="mt-10">
          <h2 className="text-base font-bold mb-1" style={{ color: "var(--ink)" }}>
            Пробелы — конкуренты цитируются, вы нет
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--ink-3)" }}>
            Это сайты, которые AI-платформы используют как источники для конкурентов, но не для вас.
            Получить присутствие там = прямой рост видимости.
          </p>
          <div className="space-y-2">
            {gaps.slice(0, 20).map((g, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ border: "1px solid var(--rule)", background: "var(--bone)" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "13px",
                    color: "var(--ink-2)",
                  }}
                >
                  {g.domain}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--ink-3)",
                    background: "var(--bone-2)",
                    border: "1px solid var(--rule)",
                    borderRadius: "3px",
                    padding: "2px 8px",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {g.competitor}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link to full report */}
      {job && (
        <div className="mt-10 pt-6" style={{ borderTop: "1px solid var(--rule)" }}>
          <Link
            href={`/report/${job.id}?token=${job.reportToken}`}
            style={{
              fontSize: "13px",
              color: "var(--ink-3)",
              textDecoration: "none",
            }}
          >
            Открыть полный отчёт →
          </Link>
        </div>
      )}
    </div>
  )
}
