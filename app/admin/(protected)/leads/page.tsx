import { prisma } from "@/lib/prisma"
import { LeadsTable, type LeadRow } from "@/components/admin/LeadsTable"

export default async function LeadsPage() {
  const [scans, auditJobs, leads, campaigns] = await Promise.all([
    prisma.freemiumScan.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.auditJob.findMany({
      select: { clientEmail: true, paidAt: true },
    }),
    prisma.lead.findMany({
      include: {
        outreachEmails: { select: { sentAt: true, openedAt: true, clickedAt: true } },
      },
    }),
    prisma.campaign.findMany({
      include: {
        outreachEmails: {
          select: { leadId: true, sentAt: true, openedAt: true, clickedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ])

  // Build lookup maps
  const auditByEmail = new Map<string, { paidAt: Date | null }>()
  for (const j of auditJobs) {
    const key = j.clientEmail.toLowerCase()
    if (!auditByEmail.has(key)) auditByEmail.set(key, { paidAt: j.paidAt })
  }

  const leadByEmail = new Map(
    leads
      .filter((l) => l.email)
      .map((l) => [l.email!.toLowerCase(), l])
  )

  // Funnel metrics
  const totalScans = scans.length
  const withEmail = scans.filter((s) => s.emailCaptured).length
  const converted = scans.filter((s) => s.emailCaptured && auditByEmail.has(s.emailCaptured.toLowerCase())).length
  const paid = scans.filter((s) => s.emailCaptured && auditByEmail.get(s.emailCaptured.toLowerCase())?.paidAt).length
  const unconverted = withEmail - converted

  // Email sequence stats (across all campaigns)
  const totalSent = leads.reduce((s, l) => s + l.outreachEmails.filter((e) => e.sentAt).length, 0)
  const totalOpened = leads.reduce((s, l) => s + l.outreachEmails.filter((e) => e.openedAt).length, 0)
  const totalClicked = leads.reduce((s, l) => s + l.outreachEmails.filter((e) => e.clickedAt).length, 0)
  const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : null
  const clickRate = totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : null

  // Build table rows
  const rows: LeadRow[] = scans.map((s) => {
    const emailKey = s.emailCaptured?.toLowerCase()
    const audit = emailKey ? auditByEmail.get(emailKey) : undefined
    const lead = emailKey ? leadByEmail.get(emailKey) : undefined

    return {
      id: s.id,
      websiteUrl: s.websiteUrl,
      companyName: s.companyName,
      email: s.emailCaptured ?? null,
      score: s.previewScore,
      niche: s.niche,
      source: s.source ?? null,
      createdAt: s.createdAt.toISOString(),
      converted: !!audit,
      paid: !!audit?.paidAt,
      emailSequence: lead
        ? {
            sent: lead.outreachEmails.filter((e) => e.sentAt).length,
            opened: lead.outreachEmails.some((e) => e.openedAt !== null),
            clicked: lead.outreachEmails.some((e) => e.clickedAt !== null),
          }
        : null,
    }
  })

  const emailCaptureRate = totalScans > 0 ? Math.round((withEmail / totalScans) * 100) : null
  const conversionRate = withEmail > 0 ? Math.round((converted / withEmail) * 100) : null
  const paymentRate = converted > 0 ? Math.round((paid / converted) * 100) : null

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Лиды</h1>
        <p className="text-sm text-[#6A6D75]">Freemium-сканы и конверсия в платных клиентов</p>
      </div>

      {/* Funnel */}
      <section className="mb-8">
        <p className="text-xs text-[#6A6D75] uppercase tracking-widest mb-3">Воронка freemium → платный</p>
        <div className="grid grid-cols-4 gap-px bg-[#F2F1EB] rounded-xl overflow-hidden">
          {[
            {
              label: "Сканов запущено",
              value: totalScans,
              sub: "все посетители",
              cls: "text-[#0F1115]",
              pct: null,
            },
            {
              label: "Оставили email",
              value: withEmail,
              sub: `${emailCaptureRate !== null ? emailCaptureRate + "%" : "—"} от сканов`,
              cls: "text-blue-700",
              pct: emailCaptureRate,
            },
            {
              label: "Создали заявку",
              value: converted,
              sub: `${conversionRate !== null ? conversionRate + "%" : "—"} от email`,
              cls: "text-[#4C6218]",
              pct: conversionRate,
            },
            {
              label: "Оплатили",
              value: paid,
              sub: `${paymentRate !== null ? paymentRate + "%" : "—"} от заявок`,
              cls: "text-emerald-700",
              pct: paymentRate,
            },
          ].map((step, i) => (
            <div key={i} className="bg-white p-6">
              <p className="text-xs text-[#6A6D75] uppercase tracking-wider mb-2">{step.label}</p>
              <p className={`text-4xl font-bold font-mono ${step.cls}`}>{step.value}</p>
              <p className="text-xs text-[#6A6D75] mt-1.5">{step.sub}</p>
            </div>
          ))}
        </div>

        {/* Visual funnel bars */}
        <div className="mt-3 space-y-1.5">
          {[
            { label: "Сканов", value: totalScans, max: totalScans, color: "#3f3f46" },
            { label: "Email", value: withEmail, max: totalScans, color: "#3b82f6" },
            { label: "Заявки", value: converted, max: totalScans, color: "#f59e0b" },
            { label: "Оплатили", value: paid, max: totalScans, color: "#10b981" },
          ].map((bar) => {
            const pct = bar.max > 0 ? Math.round((bar.value / bar.max) * 100) : 0
            return (
              <div key={bar.label} className="flex items-center gap-3">
                <span className="text-xs text-[#6A6D75] w-16 text-right shrink-0">{bar.label}</span>
                <div className="flex-1 h-3 bg-[#F2F1EB]/60 rounded overflow-hidden">
                  <div className="h-full rounded transition-all" style={{ width: `${pct}%`, background: bar.color }} />
                </div>
                <span className="text-xs font-mono text-[#6A6D75] w-20 shrink-0">
                  {bar.value} <span className="text-[#6A6D75]">({pct}%)</span>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Email sequence performance */}
      <section className="mb-8 grid grid-cols-4 gap-4">
        <div className="bg-white border border-[#E5E5E1] rounded-xl p-5">
          <p className="text-xs text-[#6A6D75] uppercase tracking-wider mb-1">Не купили</p>
          <p className="text-3xl font-bold font-mono text-red-700">{unconverted}</p>
          <p className="text-xs text-[#6A6D75] mt-1">лидов ждут возврата</p>
        </div>
        <div className="bg-white border border-[#E5E5E1] rounded-xl p-5">
          <p className="text-xs text-[#6A6D75] uppercase tracking-wider mb-1">Писем отправлено</p>
          <p className="text-3xl font-bold font-mono text-[#0F1115]">{totalSent}</p>
          <p className="text-xs text-[#6A6D75] mt-1">через все кампании</p>
        </div>
        <div className="bg-white border border-[#E5E5E1] rounded-xl p-5">
          <p className="text-xs text-[#6A6D75] uppercase tracking-wider mb-1">Open rate</p>
          <p className={`text-3xl font-bold font-mono ${openRate === null ? "text-[#6A6D75]" : openRate >= 30 ? "text-emerald-700" : openRate >= 15 ? "text-[#4C6218]" : "text-red-700"}`}>
            {openRate !== null ? `${openRate}%` : "—"}
          </p>
          <p className="text-xs text-[#6A6D75] mt-1">{totalOpened} открыли письмо</p>
        </div>
        <div className="bg-white border border-[#E5E5E1] rounded-xl p-5">
          <p className="text-xs text-[#6A6D75] uppercase tracking-wider mb-1">Click rate</p>
          <p className={`text-3xl font-bold font-mono ${clickRate === null ? "text-[#6A6D75]" : clickRate >= 10 ? "text-emerald-700" : clickRate >= 5 ? "text-[#4C6218]" : "text-red-700"}`}>
            {clickRate !== null ? `${clickRate}%` : "—"}
          </p>
          <p className="text-xs text-[#6A6D75] mt-1">{totalClicked} кликнули по ссылке</p>
        </div>
      </section>

      {/* Leads table */}
      <section className="mb-10">
        <LeadsTable leads={rows} />
      </section>

      {/* Retargeting export */}
      <section className="mb-10">
        <p className="text-xs text-[#6A6D75] uppercase tracking-widest mb-3">Экспорт аудиторий для ретаргетинга</p>
        <div className="bg-white border border-[#E5E5E1] rounded-xl p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              {
                href: "/api/admin/leads/retargeting?segment=all",
                label: "Все с email",
                desc: `${withEmail} контактов — Яндекс.Аудитории, VK`,
                color: "border-[#E5E5E1] text-[#0F1115] hover:border-[#E5E5E1]",
              },
              {
                href: "/api/admin/leads/retargeting?segment=hot",
                label: "Горячие (score ≥ 50)",
                desc: `${scans.filter((s) => s.emailCaptured && s.previewScore >= 50).length} контактов — высокий AI-Score`,
                color: "border-amber-800/50 text-[#4C6218] hover:border-amber-600",
              },
              {
                href: "/api/admin/leads/retargeting?segment=unconverted",
                label: "Не купили",
                desc: `${unconverted} контактов — основной сегмент возврата`,
                color: "border-red-800/50 text-red-700 hover:border-red-600",
              },
              {
                href: "/api/admin/leads/retargeting?segment=noopen",
                label: "Не открыли письмо",
                desc: "Не читали email — нужен другой канал",
                color: "border-violet-800/50 text-violet-300 hover:border-violet-600",
              },
            ].map((btn) => (
              <a
                key={btn.href}
                href={btn.href}
                className={`flex items-start justify-between p-4 bg-white border rounded-xl transition-colors group ${btn.color}`}
              >
                <div>
                  <p className="text-sm font-semibold">{btn.label}</p>
                  <p className="text-xs text-[#6A6D75] mt-0.5">{btn.desc}</p>
                </div>
                <span className="text-lg opacity-60 group-hover:opacity-100 transition-opacity ml-4 shrink-0">↓</span>
              </a>
            ))}
          </div>
          <p className="text-xs text-[#6A6D75]">
            CSV совместим с Яндекс.Аудиториями, VK Рекламой и Meta Custom Audiences. Загрузите файл в рекламный кабинет → создайте похожую аудиторию (Look-alike).
          </p>
        </div>
      </section>

      {/* Campaigns */}
      {campaigns.length > 0 && (
        <section>
          <p className="text-xs text-[#6A6D75] uppercase tracking-widest mb-3">Email-кампании</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-[#6A6D75] border-b border-[#E5E5E1]">
                  <th className="pb-3 pr-6 font-medium">Кампания</th>
                  <th className="pb-3 pr-6 font-medium">Статус</th>
                  <th className="pb-3 pr-6 font-medium">Лидов</th>
                  <th className="pb-3 pr-6 font-medium">Отправлено</th>
                  <th className="pb-3 pr-6 font-medium">Открыли</th>
                  <th className="pb-3 font-medium">Кликнули</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const sent = c.outreachEmails.filter((e) => e.sentAt).length
                  const opened = c.outreachEmails.filter((e) => e.openedAt).length
                  const clicked = c.outreachEmails.filter((e) => e.clickedAt).length
                  const uniqueLeads = new Set(c.outreachEmails.map((e) => e.leadId)).size

                  const STATUS_STYLE: Record<string, string> = {
                    DRAFT: "bg-[#F2F1EB] text-[#6A6D75]",
                    ACTIVE: "bg-emerald-50 text-emerald-700",
                    PAUSED: "bg-[#C8F24A] text-[#4C6218]",
                    COMPLETED: "bg-[#F2F1EB] text-[#6A6D75]",
                  }

                  return (
                    <tr key={c.id} className="border-b border-[#E5E5E1]/40 hover:bg-[#F2F1EB]/20">
                      <td className="py-3.5 pr-6">
                        <p className="text-[#0F1115] font-medium">{c.name}</p>
                        {c.targetNiche && <p className="text-xs text-[#6A6D75] mt-0.5">{c.targetNiche}</p>}
                      </td>
                      <td className="py-3.5 pr-6">
                        <span className={`text-xs px-2.5 py-1 rounded-full ${STATUS_STYLE[c.status] ?? STATUS_STYLE.DRAFT}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-6 font-mono text-[#0F1115]">{uniqueLeads}</td>
                      <td className="py-3.5 pr-6 font-mono text-[#0F1115]">{sent}</td>
                      <td className="py-3.5 pr-6">
                        <span className={`font-mono ${opened > 0 ? "text-blue-700" : "text-[#6A6D75]"}`}>
                          {opened}
                          {sent > 0 && <span className="text-[#6A6D75] text-xs ml-1">({Math.round(opened / sent * 100)}%)</span>}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`font-mono ${clicked > 0 ? "text-violet-400" : "text-[#6A6D75]"}`}>
                          {clicked}
                          {sent > 0 && <span className="text-[#6A6D75] text-xs ml-1">({Math.round(clicked / sent * 100)}%)</span>}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
