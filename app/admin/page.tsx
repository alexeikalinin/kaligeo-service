import { prisma } from "@/lib/prisma"
import Link from "next/link"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Ожидание", cls: "bg-zinc-700 text-zinc-400" },
  GENERATING_QUERIES: { label: "Запросы", cls: "bg-blue-900/30 text-blue-400" },
  EXECUTING_QUERIES: { label: "Опрос AI", cls: "bg-blue-900/30 text-blue-400" },
  ANALYZING: { label: "Анализ", cls: "bg-purple-900/30 text-purple-400" },
  GENERATING_REPORT: { label: "Отчёт", cls: "bg-amber-900/30 text-amber-400" },
  DELIVERING: { label: "Отправка", cls: "bg-amber-900/30 text-amber-400" },
  COMPLETED: { label: "Готово", cls: "bg-emerald-900/30 text-emerald-400" },
  FAILED: { label: "Ошибка", cls: "bg-red-900/30 text-red-400" },
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
  const inProgress = total - completed - failed

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Аудит-задания</h1>
        <Link
          href="/admin/submit"
          className="px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold hover:bg-white transition-colors"
        >
          + Новый аудит
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Всего", value: total, cls: "text-zinc-100" },
          { label: "Завершено", value: completed, cls: "text-emerald-400" },
          { label: "В работе", value: inProgress, cls: "text-blue-400" },
          { label: "Ошибок", value: failed, cls: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="bg-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500 text-xs border-b border-zinc-800">
              <th className="pb-3 pr-4 font-medium">Компания</th>
              <th className="pb-3 pr-4 font-medium">Ниша</th>
              <th className="pb-3 pr-4 font-medium">Тариф</th>
              <th className="pb-3 pr-4 font-medium">Статус</th>
              <th className="pb-3 pr-4 font-medium">Score</th>
              <th className="pb-3 pr-4 font-medium">Дата</th>
              <th className="pb-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => {
              const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.PENDING
              const score = job.report?.overallScore ?? null
              const date = new Date(job.createdAt).toLocaleDateString("ru-RU")
              return (
                <tr key={job.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="py-3 pr-4 text-zinc-200 font-medium">{job.companyName}</td>
                  <td className="py-3 pr-4 text-zinc-400 max-w-48 truncate">{job.niche}</td>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">{job.tier}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className={`py-3 pr-4 font-mono font-bold ${scoreColor(score)}`}>
                    {score ?? "—"}
                  </td>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">{date}</td>
                  <td className="py-3">
                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
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
