import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Suspense } from "react"
import { NicheSidebar } from "@/components/dashboard/NicheSidebar"

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Ожидание",
  GENERATING_QUERIES: "Запросы",
  EXECUTING_QUERIES: "Опрос AI",
  ANALYZING: "Анализ",
  GENERATING_REPORT: "Отчёт",
  DELIVERING: "Отправка",
  COMPLETED: "Готово",
  FAILED: "Ошибка",
}

function scoreStyle(score: number | null): string {
  if (score === null) return "color:var(--ink-3)"
  if (score >= 60) return "color:#22c55e"
  if (score >= 30) return "color:#f59e0b"
  return "color:#ef4444"
}

interface PageProps {
  searchParams: Promise<{ niche?: string }>
}

async function DashboardContent({ nicheFilter }: { nicheFilter: string }) {
  const where = nicheFilter ? { niche: nicheFilter } : {}

  const [jobs, allJobs] = await Promise.all([
    prisma.auditJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { report: { select: { overallScore: true } } },
    }),
    prisma.auditJob.findMany({
      select: { niche: true },
      orderBy: { createdAt: "desc" },
    }),
  ])

  // Build niche groups from all jobs
  const nicheCounts = new Map<string, number>()
  for (const j of allJobs) {
    nicheCounts.set(j.niche, (nicheCounts.get(j.niche) ?? 0) + 1)
  }
  const niches = Array.from(nicheCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([full, count]) => ({
      full,
      label: full.slice(0, 42) + (full.length > 42 ? "…" : ""),
      count,
    }))

  const completed = jobs.filter((j) => j.status === "COMPLETED").length
  const avgScore =
    jobs.filter((j) => j.report).length > 0
      ? Math.round(
          jobs.reduce((acc, j) => acc + (j.report?.overallScore ?? 0), 0) /
            jobs.filter((j) => j.report).length
        )
      : null

  return (
    <div className="flex gap-8">
      <Suspense>
        <NicheSidebar niches={niches} total={allJobs.length} />
      </Suspense>

      <div className="flex-1 min-w-0">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Аудитов", value: jobs.length },
            { label: "Завершено", value: completed },
            { label: "Средний score", value: avgScore ?? "—" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-lg p-4"
              style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
            >
              <p className="t-eyebrow mb-2">{s.label}</p>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Job list */}
        {jobs.length === 0 ? (
          <div
            className="rounded-lg p-12 text-center"
            style={{ border: "1px dashed var(--rule)", color: "var(--ink-3)" }}
          >
            <p className="text-sm">Аудитов пока нет</p>
            <Link
              href="/pricing"
              className="mt-4 inline-block text-sm font-medium transition-colors"
              style={{ color: "var(--ink)" }}
            >
              Запустить первый →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => {
              const score = job.report?.overallScore ?? null
              const date = new Date(job.createdAt).toLocaleDateString("ru-RU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
              const statusLabel = STATUS_LABEL[job.status] ?? job.status
              const isDone = job.status === "COMPLETED"
              const isFailed = job.status === "FAILED"

              return (
                <div
                  key={job.id}
                  className="flex items-center gap-4 rounded-lg px-4 py-3 transition-colors hover:bg-[var(--bone-2)]"
                  style={{ border: "1px solid var(--rule)" }}
                >
                  {/* Score badge */}
                  <div
                    className="w-10 h-10 rounded shrink-0 flex items-center justify-center font-mono font-bold text-sm"
                    style={{
                      background: "var(--bone-2)",
                      ...(score !== null ? { color: "#22c55e" } : { color: "var(--ink-3)" }),
                      ...(score !== null && score < 30 ? { color: "#ef4444" } : {}),
                      ...(score !== null && score >= 30 && score < 60
                        ? { color: "#f59e0b" }
                        : {}),
                    }}
                  >
                    {score ?? "—"}
                  </div>

                  {/* Company + niche */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{job.companyName}</p>
                    <p className="text-xs truncate" style={{ color: "var(--ink-3)" }}>
                      {job.niche.slice(0, 80)}
                    </p>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="monotag"
                      style={
                        isDone
                          ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-ink)" }
                          : isFailed
                          ? { borderColor: "#ef4444", color: "#ef4444" }
                          : {}
                      }
                    >
                      {statusLabel}
                    </span>
                    <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                      {date}
                    </span>
                    {isDone ? (
                      <Link
                        href={`/report/${job.id}`}
                        className="text-xs font-medium transition-colors hover:opacity-70"
                        style={{ color: "var(--ink)" }}
                      >
                        Отчёт →
                      </Link>
                    ) : (
                      <Link
                        href={`/audit/${job.id}`}
                        className="text-xs transition-colors"
                        style={{ color: "var(--ink-3)" }}
                      >
                        Статус →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { niche = "" } = await searchParams

  return (
    <div>
      <div className="mb-8">
        <p className="t-eyebrow mb-1">Обзор</p>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>
          {niche ? niche.slice(0, 60) : "Все аудиты"}
        </h1>
      </div>

      <DashboardContent nicheFilter={niche} />
    </div>
  )
}
