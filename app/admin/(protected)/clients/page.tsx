import { prisma } from "@/lib/prisma"
import Link from "next/link"

function clientTag(n: number) {
  return `KG-${String(n).padStart(3, "0")}`
}

function scoreColor(score: number | null) {
  if (score === null) return "text-zinc-600"
  if (score >= 60) return "text-emerald-400"
  if (score >= 30) return "text-amber-400"
  return "text-red-400"
}

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { clientNumber: "asc" },
    include: {
      auditJobs: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          tier: true,
          createdAt: true,
          completedAt: true,
          report: { select: { overallScore: true } },
        },
      },
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold">Клиенты</h1>
          <p className="text-zinc-500 text-sm mt-1">{clients.length} клиентов в базе</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
              <th className="pb-4 pr-6 font-medium">#</th>
              <th className="pb-4 pr-6 font-medium">Компания</th>
              <th className="pb-4 pr-6 font-medium">Email</th>
              <th className="pb-4 pr-6 font-medium">Сайт</th>
              <th className="pb-4 pr-6 font-medium">Аудитов</th>
              <th className="pb-4 pr-6 font-medium">Лучший score</th>
              <th className="pb-4 pr-6 font-medium">Последний аудит</th>
              <th className="pb-4 font-medium">Клиент с</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const completedJobs = client.auditJobs.filter((j) => j.status === "COMPLETED")
              const scores = completedJobs.map((j) => j.report?.overallScore ?? null).filter((s): s is number => s !== null)
              const bestScore = scores.length > 0 ? Math.max(...scores) : null
              const lastJob = client.auditJobs[0]

              return (
                <tr key={client.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20">
                  <td className="py-4 pr-6">
                    <span className="font-mono text-sm text-zinc-400">{clientTag(client.clientNumber)}</span>
                  </td>
                  <td className="py-4 pr-6 text-zinc-200 font-medium">{client.companyName}</td>
                  <td className="py-4 pr-6 text-zinc-400 text-sm">{client.email}</td>
                  <td className="py-4 pr-6 text-zinc-500 text-sm">
                    {client.websiteUrl ? (
                      <a href={client.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-300 transition-colors">
                        {client.websiteUrl.replace(/^https?:\/\//, "")}
                      </a>
                    ) : "—"}
                  </td>
                  <td className="py-4 pr-6">
                    <span className="text-zinc-300">{client.auditJobs.length}</span>
                    {completedJobs.length < client.auditJobs.length && (
                      <span className="text-zinc-600 text-xs ml-1">
                        ({completedJobs.length} завершено)
                      </span>
                    )}
                  </td>
                  <td className={`py-4 pr-6 font-mono font-bold text-lg ${scoreColor(bestScore)}`}>
                    {bestScore ?? "—"}
                  </td>
                  <td className="py-4 pr-6 text-zinc-400 text-sm">
                    {lastJob ? (
                      <Link href={`/admin/jobs/${lastJob.id}`} className="hover:text-zinc-200 transition-colors">
                        {new Date(lastJob.createdAt).toLocaleDateString("ru-RU", {
                          day: "numeric", month: "short",
                        })}
                        {" · "}
                        <span className="text-zinc-600">{lastJob.tier}</span>
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="py-4 text-zinc-600 text-sm">
                    {new Date(client.createdAt).toLocaleDateString("ru-RU", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {clients.length === 0 && (
          <div className="text-center py-20 text-zinc-600">
            Пока нет ни одного клиента
          </div>
        )}
      </div>
    </div>
  )
}
