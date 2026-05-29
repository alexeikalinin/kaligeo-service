import { schedules } from "@trigger.dev/sdk/v3"
import { Resend } from "resend"
import { prisma } from "../lib/prisma"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}
const FROM = () => process.env.FROM_EMAIL ?? "hello@kaligeo.ru"
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"

const TIER_NAMES: Record<string, string> = {
  MONITOR_START: "Мониторинг Старт",
  MONITOR_PRO:   "Мониторинг Про",
  MONITOR_AGENT: "Мониторинг Агент",
}

export const renewalReminder = schedules.task({
  id: "renewal-reminder",
  // Каждый день в 09:00 UTC — ищем подписки, истекающие через 7 дней
  cron: "0 9 * * *",

  run: async () => {
    const now = new Date()
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const in8d = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000)

    // Найти аудиты с подпиской, истекающей через ~7 дней, без уже отправленного ремайндера
    const expiring = await prisma.auditJob.findMany({
      where: {
        subscriptionActiveUntil: { gte: in7d, lt: in8d },
        renewalReminderSentAt: null,
        status: "COMPLETED",
      },
    })

    console.log(`[renewal-reminder] Found ${expiring.length} expiring subscriptions`)

    let sent = 0
    for (const job of expiring) {
      try {
        const tierName = TIER_NAMES[job.subscriptionTier ?? ""] ?? job.subscriptionTier ?? "Подписка"
        const expiryDate = job.subscriptionActiveUntil!.toLocaleDateString("ru-RU", {
          day: "numeric", month: "long", year: "numeric",
        })

        // Статистика за период подписки
        const allJobs = await prisma.auditJob.findMany({
          where: {
            clientEmail: job.clientEmail,
            status: "COMPLETED",
            completedAt: { gte: new Date(job.createdAt.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
          include: { report: { select: { overallScore: true } } },
          orderBy: { completedAt: "asc" },
        })

        const scores = allJobs.map((j) => j.report?.overallScore ?? 0).filter(Boolean)
        const firstScore = scores[0] ?? 0
        const lastScore = scores[scores.length - 1] ?? 0
        const scoreDelta = lastScore - firstScore
        const auditCount = allJobs.length

        const pricingUrl = `${APP_URL()}/pricing`
        const reportUrl = `${APP_URL()}/report/${job.id}?token=${job.reportToken}`

        await getResend().emails.send({
          from: FROM(),
          to: job.clientEmail,
          subject: `${job.companyName}: ${tierName} заканчивается ${expiryDate}`,
          html: buildRenewalEmail({
            companyName: job.companyName,
            tierName,
            expiryDate,
            auditCount,
            firstScore,
            lastScore,
            scoreDelta,
            pricingUrl,
            reportUrl,
          }),
        })

        await prisma.auditJob.update({
          where: { id: job.id },
          data: { renewalReminderSentAt: now },
        })

        sent++
        console.log(`[renewal-reminder] Sent to ${job.clientEmail} for job ${job.id}`)
      } catch (err) {
        console.error(`[renewal-reminder] Failed for job ${job.id}:`, err)
      }
    }

    return { checked: expiring.length, sent }
  },
})

function buildRenewalEmail({
  companyName, tierName, expiryDate, auditCount,
  firstScore, lastScore, scoreDelta, pricingUrl, reportUrl,
}: {
  companyName: string
  tierName: string
  expiryDate: string
  auditCount: number
  firstScore: number
  lastScore: number
  scoreDelta: number
  pricingUrl: string
  reportUrl: string
}) {
  const deltaColor = scoreDelta > 0 ? "#16a34a" : scoreDelta < 0 ? "#dc2626" : "#6b7280"
  const deltaStr = scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`

  return `<!DOCTYPE html><html lang="ru">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0;color:#111827">
<div style="max-width:580px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:28px">
    <span style="font-family:monospace;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase">KaliGEO</span>
  </div>
  <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">

    <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-family:monospace">Напоминание о подписке</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827">
      ${tierName} заканчивается ${expiryDate}
    </h1>

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px">
      Ваша подписка KaliGEO для <strong>${companyName}</strong> заканчивается через 7 дней.
      После этой даты автоматические аудиты и алёрты остановятся, данные останутся.
    </p>

    ${auditCount > 0 ? `
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 24px">
      <p style="margin:0 0 14px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;font-family:monospace">Ваши результаты за период</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;text-align:center">
        <div>
          <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827">${auditCount}</p>
          <p style="margin:0;font-size:12px;color:#9ca3af">аудитов</p>
        </div>
        <div>
          <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#111827">${lastScore}</p>
          <p style="margin:0;font-size:12px;color:#9ca3af">текущий score</p>
        </div>
        <div>
          <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:${deltaColor}">${deltaStr}</p>
          <p style="margin:0;font-size:12px;color:#9ca3af">динамика</p>
        </div>
      </div>
    </div>` : ""}

    <div style="background:#fef9f0;border-radius:10px;padding:14px 16px;margin:0 0 20px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#92400e">Что произойдёт после истечения</p>
      <ul style="margin:6px 0 0;padding-left:18px;font-size:13px;color:#374151;line-height:1.9">
        <li>Автоматические аудиты остановятся</li>
        <li>Алёрты о падении видимости отключатся</li>
        <li>История аудитов и отчёты останутся доступны</li>
      </ul>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${pricingUrl}" style="display:inline-block;background:#111827;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
        Продлить подписку →
      </a>
    </div>

    <p style="text-align:center;margin:0">
      <a href="${reportUrl}" style="font-size:13px;color:#9ca3af">Посмотреть последний отчёт</a>
    </p>

  </div>
  <p style="text-align:center;margin-top:16px;font-size:11px;color:#9ca3af">
    KaliGEO · Мониторинг AI-видимости · <a href="mailto:hello@kaligeo.ru?subject=Отписаться" style="color:#9ca3af">Отписаться</a>
  </p>
</div>
</body></html>`
}
