import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { FunnelCharts } from "@/components/admin/FunnelCharts"

const TIER_PRICE: Record<string, number> = {
  BASIC: 5000,
  STANDARD: 12000,
  ADVANCED: 29000,
  MONITOR_START: 9900,
  MONITOR_PRO: 19900,
  MONITOR_AGENT: 49900,
}

const TIER_COLOR: Record<string, string> = {
  BASIC: "#3f3f46",
  STANDARD: "#1d4ed8",
  ADVANCED: "#7c3aed",
  MONITOR_START: "#065f46",
  MONITOR_PRO: "#0f766e",
  MONITOR_AGENT: "#0e7490",
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - ((day + 6) % 7))
  d.setHours(0, 0, 0, 0)
  return d
}

function weekLabel(date: Date): string {
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
}

export default async function FunnelPage() {
  const now = new Date()
  const eightWeeksAgo = new Date(now.getTime() - 8 * 7 * 24 * 60 * 60 * 1000)

  const [allJobs, recentJobs] = await Promise.all([
    prisma.auditJob.findMany({
      select: { tier: true, status: true, paidAt: true, createdAt: true },
    }),
    prisma.auditJob.findMany({
      where: { createdAt: { gte: eightWeeksAgo } },
      select: { createdAt: true, status: true, tier: true, paidAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ])

  // --- Funnel stats ---
  const total = allJobs.length
  const paid = allJobs.filter((j) => j.paidAt !== null).length
  const completed = allJobs.filter((j) => j.status === "COMPLETED").length
  const failed = allJobs.filter((j) => j.status === "FAILED").length

  // --- Revenue by tier ---
  const revenueByTier: Record<string, number> = {}
  const countByTier: Record<string, number> = {}
  for (const j of allJobs) {
    if (j.paidAt) {
      revenueByTier[j.tier] = (revenueByTier[j.tier] ?? 0) + (TIER_PRICE[j.tier] ?? 0)
      countByTier[j.tier] = (countByTier[j.tier] ?? 0) + 1
    }
  }
  const totalRevenue = Object.values(revenueByTier).reduce((s, v) => s + v, 0)

  const tierBreakdown = Object.entries(revenueByTier)
    .sort((a, b) => b[1] - a[1])
    .map(([tier, revenue]) => ({
      tier,
      revenue,
      count: countByTier[tier] ?? 0,
      pct: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0,
      color: TIER_COLOR[tier] ?? "#3f3f46",
    }))

  // --- Weekly jobs for bar chart ---
  const weekMap: Map<string, { created: number; completed: number; revenue: number }> = new Map()

  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
    const ws = startOfWeek(weekStart)
    const key = ws.toISOString()
    if (!weekMap.has(key)) {
      weekMap.set(key, { created: 0, completed: 0, revenue: 0 })
    }
  }

  for (const j of recentJobs) {
    const ws = startOfWeek(j.createdAt)
    const key = ws.toISOString()
    const entry = weekMap.get(key)
    if (!entry) continue
    entry.created++
    if (j.status === "COMPLETED") entry.completed++
    if (j.paidAt) entry.revenue += TIER_PRICE[j.tier] ?? 0
  }

  const weeklyData = Array.from(weekMap.entries()).map(([key, v]) => ({
    week: weekLabel(new Date(key)),
    created: v.created,
    completed: v.completed,
    revenue: v.revenue,
  }))

  // --- Monthly revenue last 6 months ---
  const monthMap: Map<string, number> = new Map()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
    monthMap.set(key, 0)
  }
  for (const j of allJobs) {
    if (!j.paidAt) continue
    const key = j.paidAt.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" })
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + (TIER_PRICE[j.tier] ?? 0))
    }
  }
  const monthlyRevenue = Array.from(monthMap.entries()).map(([month, revenue]) => ({
    month,
    revenue,
  }))

  return (
    <div>
      <div className="flex items-center gap-4 mb-10">
        <Link href="/admin" className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">
          ← Заявки
        </Link>
        <h1 className="text-3xl font-bold">Аналитика</h1>
      </div>

      {/* Conversion funnel */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
          Воронка конверсии
        </h2>
        <div className="grid grid-cols-4 gap-px bg-zinc-800 rounded-xl overflow-hidden">
          {[
            { label: "Создано", value: total, cls: "text-zinc-100", sub: "все заявки" },
            { label: "Оплачено", value: paid, pct: total > 0 ? Math.round((paid / total) * 100) : null, cls: "text-yellow-400", sub: "подтвердили оплату" },
            { label: "Запущено", value: paid, pct: total > 0 ? Math.round((paid / total) * 100) : null, cls: "text-blue-400", sub: "запущены в работу" },
            { label: "Завершено", value: completed, pct: paid > 0 ? Math.round((completed / paid) * 100) : null, cls: "text-emerald-400", sub: "получили отчёт" },
          ].map((step, i) => (
            <div key={i} className="bg-zinc-900 p-6">
              <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">{step.label}</p>
              <p className={`text-4xl font-bold font-mono ${step.cls}`}>{step.value}</p>
              {step.pct !== null && step.pct !== undefined && (
                <p className="text-xs text-zinc-500 mt-1">{step.pct}% от предыдущего</p>
              )}
              <p className="text-xs text-zinc-700 mt-0.5">{step.sub}</p>
            </div>
          ))}
        </div>

        {/* Funnel bars */}
        <div className="mt-3 space-y-2">
          {[
            { label: "Создано", value: total, color: "#3f3f46" },
            { label: "Оплачено", value: paid, color: "#ca8a04" },
            { label: "Завершено", value: completed, color: "#059669" },
            { label: "Ошибки", value: failed, color: "#dc2626" },
          ].map((bar) => {
            const pct = total > 0 ? Math.round((bar.value / total) * 100) : 0
            return (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-24 text-right shrink-0">{bar.label}</span>
                <div className="flex-1 h-5 bg-zinc-800/50 rounded-md overflow-hidden">
                  <div
                    className="h-full rounded-md transition-all"
                    style={{ width: `${pct}%`, background: bar.color }}
                  />
                </div>
                <span className="text-xs font-mono text-zinc-400 w-16 shrink-0">
                  {bar.value} <span className="text-zinc-600">({pct}%)</span>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Revenue by tier */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
          Выручка по тарифам
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-xs text-zinc-500 mb-1">Суммарно</p>
            <p className="text-3xl font-bold font-mono text-zinc-100 mb-4">
              {totalRevenue.toLocaleString("ru-RU")} ₽
            </p>
            <div className="space-y-3">
              {tierBreakdown.map((t) => (
                <div key={t.tier}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-zinc-300">{t.tier}</span>
                    <span className="text-sm font-mono text-zinc-400">
                      {t.revenue.toLocaleString("ru-RU")} ₽
                      <span className="text-zinc-600 ml-2">{t.count} аудитов</span>
                    </span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${t.pct}%`, background: t.color }}
                    />
                  </div>
                </div>
              ))}
              {tierBreakdown.length === 0 && (
                <p className="text-sm text-zinc-600">Пока нет оплаченных аудитов</p>
              )}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <p className="text-xs text-zinc-500 mb-4">Выручка по месяцам</p>
            <div className="space-y-2">
              {monthlyRevenue.map((m) => {
                const max = Math.max(...monthlyRevenue.map((x) => x.revenue), 1)
                const pct = Math.round((m.revenue / max) * 100)
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-16 shrink-0">{m.month}</span>
                    <div className="flex-1 h-4 bg-zinc-800/50 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${pct}%`, background: "#7c3aed" }}
                      />
                    </div>
                    <span className="text-xs font-mono text-zinc-400 w-20 text-right shrink-0">
                      {m.revenue > 0 ? m.revenue.toLocaleString("ru-RU") + " ₽" : "—"}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Weekly charts (client component with recharts) */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
          Динамика за 8 недель
        </h2>
        <FunnelCharts weeklyData={weeklyData} />
      </section>

      {/* Export */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-4">
          Экспорт
        </h2>
        <div className="flex gap-3">
          <a
            href="/api/admin/export?format=csv"
            className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg text-sm hover:bg-zinc-700 hover:border-zinc-600 transition-colors"
          >
            Скачать CSV — все заявки
          </a>
        </div>
        <p className="text-xs text-zinc-600 mt-2">
          Экспортируются все поля: компания, email, тариф, статус, дата, score, оплата
        </p>
      </section>
    </div>
  )
}
