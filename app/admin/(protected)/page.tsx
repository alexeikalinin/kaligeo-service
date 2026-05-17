import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { ConfirmPaymentButton } from "@/components/admin/ConfirmPaymentButton"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT: { label: "Ждёт оплаты", cls: "bg-yellow-900/30 text-yellow-400" },
  PENDING:         { label: "В очереди",   cls: "bg-zinc-700 text-zinc-400" },
  GENERATING_QUERIES: { label: "Запросы",  cls: "bg-blue-900/30 text-blue-400" },
  EXECUTING_QUERIES:  { label: "Опрос AI", cls: "bg-blue-900/30 text-blue-400" },
  ANALYZING:          { label: "Анализ",   cls: "bg-purple-900/30 text-purple-400" },
  GENERATING_REPORT:  { label: "Отчёт",    cls: "bg-amber-900/30 text-amber-400" },
  DELIVERING:         { label: "Отправка", cls: "bg-amber-900/30 text-amber-400" },
  COMPLETED:          { label: "Готово",   cls: "bg-emerald-900/30 text-emerald-400" },
  FAILED:             { label: "Ошибка",   cls: "bg-red-900/30 text-red-400" },
}

function scoreColor(score: number | null) {
  if (score === null) return "text-zinc-600"
  if (score >= 60) return "text-emerald-400"
  if (score >= 30) return "text-amber-400"
  return "text-red-400"
}

export default async function AdminPage() {
  const [jobs, counts] = await Promise.all([
    prisma.auditJob.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { report: { select: { overallScore: true } } },
    }),
    prisma.auditJob.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
  ])

  const statsMap = Object.fromEntries(counts.map((c) => [c.status, c._count.id]))
  const total = jobs.length
  const completed = statsMap["COMPLETED"] ?? 0
  const failed = statsMap["FAILED"] ?? 0
  const pendingPayment = statsMap["PENDING_PAYMENT"] ?? 0
  const inProgress = total - completed - failed - pendingPayment

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-bold">Заявки</h1>
        <Link
          href="/admin/submit"
          className="px-5 py-2.5 bg-zinc-100 text-zinc-900 rounded-lg text-base font-semibold hover:bg-white transition-colors"
        >
          + Новый аудит
        </Link>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-10">
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
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
              <th className="pb-4 pr-6 font-medium">Компания</th>
              <th className="pb-4 pr-6 font-medium">Email</th>
              <th className="pb-4 pr-6 font-medium">Тариф</th>
              <th className="pb-4 pr-6 font-medium">Статус</th>
              <th className="pb-4 pr-6 font-medium">Оплата</th>
              <th className="pb-4 pr-6 font-medium">Score</th>
              <th className="pb-4 pr-6 font-medium">Дата</th>
              <th className="pb-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.PENDING
              const score = job.report?.overallScore ?? null
              const date = new Date(job.createdAt).toLocaleDateString("ru-RU")
              return (
                <tr key={job.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="py-4 pr-6 text-zinc-200 font-medium">{job.companyName}</td>
                  <td className="py-4 pr-6 text-zinc-400 text-sm">{job.clientEmail}</td>
                  <td className="py-4 pr-6 text-zinc-400 text-sm">{job.tier}</td>
                  <td className="py-4 pr-6">
                    <span className={`text-sm px-3 py-1 rounded-full ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="py-4 pr-6 text-sm">
                    {job.paidAt ? (
                      <span className="text-emerald-400">
                        ✓ {new Date(job.paidAt).toLocaleDateString("ru-RU")}
                      </span>
                    ) : (
                      <span className="text-yellow-600">—</span>
                    )}
                  </td>
                  <td className={`py-4 pr-6 font-mono font-bold text-lg ${scoreColor(score)}`}>
                    {score ?? "—"}
                  </td>
                  <td className="py-4 pr-6 text-zinc-400 text-sm">{date}</td>
                  <td className="py-4">
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="text-base text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
