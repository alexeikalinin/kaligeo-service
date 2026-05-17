import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import type { enrichLeads } from "@/trigger/enrich-leads"

const STATUS_LABEL: Record<string, string> = {
  NEW: "Новый",
  ENRICHED: "Обогащён",
  CONTACTED: "Отправлено",
  REPLIED: "Ответил",
  CONVERTED: "Купил",
  UNSUBSCRIBED: "Отписался",
}

const STATUS_COLOR: Record<string, string> = {
  NEW: "color:#6b7280;background:#f3f4f6",
  ENRICHED: "color:#1d4ed8;background:#dbeafe",
  CONTACTED: "color:#92400e;background:#fef3c7",
  REPLIED: "color:#065f46;background:#d1fae5",
  CONVERTED: "color:#166534;background:#bbf7d0",
  UNSUBSCRIBED: "color:#9ca3af;background:#f9fafb",
}

const PAGE_SIZE = 50

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

async function enrichAction(leadId: string) {
  "use server"
  await tasks.trigger<typeof enrichLeads>("enrich-leads", { leadIds: [leadId] })
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const { status, page } = await searchParams
  const pageNum = Math.max(1, parseInt(page ?? "1", 10))
  const skip = (pageNum - 1) * PAGE_SIZE

  const where = status ? { status: status as never } : {}

  const [leads, total, stats] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ["status"],
      _count: true,
    }),
  ])

  const statMap = Object.fromEntries(stats.map((s) => [s.status, s._count]))

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {(["NEW", "ENRICHED", "CONTACTED", "REPLIED", "CONVERTED"] as const).map((s) => (
          <div
            key={s}
            className="rounded-lg p-4"
            style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
          >
            <p className="t-eyebrow mb-1">{STATUS_LABEL[s]}</p>
            <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-mono)" }}>
              {statMap[s] ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {[undefined, "NEW", "ENRICHED", "CONTACTED", "REPLIED", "CONVERTED"].map((s) => (
          <a
            key={s ?? "all"}
            href={s ? `?status=${s}` : "?"}
            className="text-xs px-3 py-1.5 rounded font-medium"
            style={{
              background: status === s ? "var(--accent)" : "var(--bone-2)",
              color: status === s ? "var(--accent-ink)" : "var(--ink-3)",
              border: "1px solid var(--rule)",
            }}
          >
            {s ? STATUS_LABEL[s] : "Все"}
          </a>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--rule)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--rule)", background: "var(--bone-2)" }}>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Компания</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Email</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Ниша</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Город</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Статус</th>
              <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--ink-3)" }}>Дата</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {leads.map((lead, i) => (
              <tr
                key={lead.id}
                style={{
                  borderBottom: i < leads.length - 1 ? "1px solid var(--rule)" : "none",
                }}
              >
                <td className="px-4 py-3 font-medium">
                  {lead.websiteUrl ? (
                    <a
                      href={lead.websiteUrl}
                      target="_blank"
                      rel="noopener"
                      className="hover:underline"
                      style={{ color: "var(--ink)" }}
                    >
                      {lead.companyName}
                    </a>
                  ) : (
                    lead.companyName
                  )}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--ink-3)" }}>
                  {lead.enrichedEmail ?? lead.email ?? "—"}
                </td>
                <td className="px-4 py-3 max-w-[160px] truncate" style={{ color: "var(--ink-3)" }}>
                  {lead.niche ? lead.niche.slice(0, 40) : "—"}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--ink-3)" }}>
                  {lead.city ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded font-medium"
                    style={STATUS_COLOR[lead.status] as never}
                  >
                    {STATUS_LABEL[lead.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--ink-3)" }}>
                  {lead.createdAt.toLocaleDateString("ru-RU")}
                </td>
                <td className="px-4 py-3 text-right">
                  {lead.status === "NEW" && !lead.enrichedEmail && lead.websiteUrl && (
                    <form action={enrichAction.bind(null, lead.id)}>
                      <button
                        type="submit"
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          border: "1px solid var(--rule)",
                          color: "var(--ink-3)",
                          background: "transparent",
                        }}
                      >
                        Обогатить
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="flex gap-2 mt-4 justify-center">
          {pageNum > 1 && (
            <a
              href={`?${status ? `status=${status}&` : ""}page=${pageNum - 1}`}
              className="text-xs px-3 py-1.5 rounded"
              style={{ border: "1px solid var(--rule)", color: "var(--ink-3)" }}
            >
              ← Назад
            </a>
          )}
          <span className="text-xs py-1.5" style={{ color: "var(--ink-3)" }}>
            {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} из {total}
          </span>
          {skip + PAGE_SIZE < total && (
            <a
              href={`?${status ? `status=${status}&` : ""}page=${pageNum + 1}`}
              className="text-xs px-3 py-1.5 rounded"
              style={{ border: "1px solid var(--rule)", color: "var(--ink-3)" }}
            >
              Вперёд →
            </a>
          )}
        </div>
      )}
    </div>
  )
}
