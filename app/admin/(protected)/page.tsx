import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ConfirmPaymentButton } from "@/components/admin/ConfirmPaymentButton"
import { JobsTable } from "@/components/admin/JobsTable"

const TIER_PRICE: Record<string, number> = {
  BASIC: 5000,
  STANDARD: 12000,
  ADVANCED: 29000,
  MONITOR_START: 9900,
  MONITOR_PRO: 19900,
  MONITOR_AGENT: 49900,
}

const IN_PROGRESS_STATUSES = [
  "GENERATING_QUERIES",
  "EXECUTING_QUERIES",
  "ANALYZING",
  "GENERATING_REPORT",
  "DELIVERING",
]

export default async function AdminPage() {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const stuckThreshold = new Date(now.getTime() - 90 * 60 * 1000)

  const [jobs, counts, paidThisMonth, todayNew, stuckJobs, freemiumStats] = await Promise.all([
    prisma.auditJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { report: { select: { overallScore: true } } },
    }),
    prisma.auditJob.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.auditJob.findMany({
      where: { paidAt: { gte: monthStart } },
      select: { tier: true },
    }),
    prisma.auditJob.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.auditJob.findMany({
      where: {
        status: { in: IN_PROGRESS_STATUSES as ("GENERATING_QUERIES" | "EXECUTING_QUERIES" | "ANALYZING" | "GENERATING_REPORT" | "DELIVERING")[] },
        updatedAt: { lt: stuckThreshold },
      },
      select: { id: true, companyName: true, status: true, updatedAt: true },
    }),
    Promise.all([
      prisma.freemiumScan.count(),
      prisma.freemiumScan.count({ where: { emailCaptured: { not: null } } }),
    ]).then(([total, withEmail]) => ({ total, withEmail })),
  ])

  const statsMap = Object.fromEntries(counts.map((c) => [c.status, c._count.id]))
  const total = jobs.length
  const completed = statsMap["COMPLETED"] ?? 0
  const failed = statsMap["FAILED"] ?? 0
  const pendingPayment = statsMap["PENDING_PAYMENT"] ?? 0
  const inProgress = total - completed - failed - pendingPayment

  const monthRevenue = paidThisMonth.reduce((s, j) => s + (TIER_PRICE[j.tier] ?? 0), 0)
  const conversionRate =
    completed + failed > 0 ? Math.round((completed / (completed + failed)) * 100) : null

  const monthName = now.toLocaleDateString("ru-RU", { month: "long" })

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Заявки</h1>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/funnel"
            className="px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded-lg hover:text-zinc-200 hover:border-zinc-500 transition-colors"
          >
            Аналитика →
          </Link>
          <Link
            href="/admin/submit"
            className="px-5 py-2.5 bg-zinc-100 text-zinc-900 rounded-lg text-base font-semibold hover:bg-white transition-colors"
          >
            + Новый аудит
          </Link>
        </div>
      </div>

      {/* Pipeline status counters */}
      <div className="grid grid-cols-5 gap-4 mb-5">
        {[
          { label: "Всего",        value: total,          cls: "text-zinc-100" },
          { label: "Ждут оплаты", value: pendingPayment, cls: "text-yellow-400" },
          { label: "В работе",    value: inProgress,     cls: "text-blue-400" },
          { label: "Завершено",   value: completed,      cls: "text-emerald-400" },
          { label: "Ошибок",      value: failed,         cls: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-800 rounded-xl p-5">
            <p className="text-sm text-zinc-500 mb-2">{s.label}</p>
            <p className={`text-4xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Business KPIs */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-widest">Выручка {monthName}</p>
          <p className="text-2xl font-bold text-zinc-100 font-mono">
            {monthRevenue.toLocaleString("ru-RU")} ₽
          </p>
          <p className="text-xs text-zinc-600 mt-1">{paidThisMonth.length} оплаченных аудитов</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-widest">Новых сегодня</p>
          <p className="text-2xl font-bold text-blue-400 font-mono">{todayNew}</p>
          <p className="text-xs text-zinc-600 mt-1">заявок за сутки</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-widest">Конверсия</p>
          <p className="text-2xl font-bold font-mono" style={{ color: conversionRate === null ? "#52525b" : conversionRate >= 90 ? "#22c55e" : conversionRate >= 70 ? "#f59e0b" : "#ef4444" }}>
            {conversionRate !== null ? `${conversionRate}%` : "—"}
          </p>
          <p className="text-xs text-zinc-600 mt-1">завершено / (завершено + ошибки)</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-widest">Зависших</p>
          <p className={`text-2xl font-bold font-mono ${stuckJobs.length > 0 ? "text-red-400" : "text-zinc-600"}`}>
            {stuckJobs.length}
          </p>
          <p className="text-xs text-zinc-600 mt-1">в работе &gt;90 мин без обновления</p>
        </div>
        <Link href="/admin/leads" className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-600 transition-colors group">
          <p className="text-xs text-zinc-500 mb-1 uppercase tracking-widest">Freemium лиды</p>
          <p className="text-2xl font-bold font-mono text-violet-400 group-hover:text-violet-300 transition-colors">
            {freemiumStats.withEmail}
          </p>
          <p className="text-xs text-zinc-600 mt-1">из {freemiumStats.total} сканов оставили email →</p>
        </Link>
      </div>

      {/* Stuck jobs alert */}
      {stuckJobs.length > 0 && (
        <div className="mb-6 border border-red-800/50 bg-red-950/20 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-400 mb-2">
            ⚠ Зависшие аудиты ({stuckJobs.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {stuckJobs.map((j) => {
              const minsAgo = Math.round((now.getTime() - j.updatedAt.getTime()) / 60000)
              return (
                <Link
                  key={j.id}
                  href={`/admin/jobs/${j.id}`}
                  className="text-xs px-3 py-1.5 bg-red-900/30 border border-red-800/40 rounded-lg text-red-300 hover:bg-red-900/50 transition-colors"
                >
                  {j.companyName} · {minsAgo} мин
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Pending payment — выделенный блок */}
      {pendingPayment > 0 && (
        <div className="mb-6 border border-yellow-800/50 rounded-xl overflow-hidden">
          <div className="bg-yellow-900/20 px-4 py-2 flex items-center gap-2">
            <span className="text-yellow-400 text-sm font-semibold">
              ⏳ Ожидают подтверждения оплаты ({pendingPayment})
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
                <th className="py-2 px-4">Компания</th>
                <th className="py-2 px-4">Email</th>
                <th className="py-2 px-4">Тариф</th>
                <th className="py-2 px-4">Заявка</th>
                <th className="py-2 px-4">Действие</th>
              </tr>
            </thead>
            <tbody>
              {jobs
                .filter((j) => j.status === "PENDING_PAYMENT")
                .map((job) => (
                  <tr key={job.id} className="border-b border-zinc-800/50 bg-yellow-900/5">
                    <td className="py-3 px-4 text-zinc-200 font-medium">{job.companyName}</td>
                    <td className="py-3 px-4 text-zinc-400 text-xs">{job.clientEmail}</td>
                    <td className="py-3 px-4 text-zinc-400 text-xs">{job.tier}</td>
                    <td className="py-3 px-4 text-zinc-500 text-xs">
                      {new Date(job.createdAt).toLocaleDateString("ru-RU", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <ConfirmPaymentButton jobId={job.id} currentTier={job.tier} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* All jobs table */}
      <JobsTable jobs={jobs} />
    </div>
  )
}
