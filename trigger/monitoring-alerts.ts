import { schedules } from "@trigger.dev/sdk/v3"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"
import { notifyScoreDrop } from "@/lib/notify"

const ALERT_THRESHOLD = 10 // минимальное падение score для уведомления
const MONITOR_TIERS = new Set(["MONITOR_START", "MONITOR_PRO", "MONITOR_AGENT"])

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}

export const monitoringAlerts = schedules.task({
  id: "monitoring-alerts",
  // Каждую пятницу в 10:00 UTC
  cron: "0 10 * * 5",
  run: async () => {
    console.log("[monitoring-alerts] Starting weekly alert check")

    // Найти все активные MONITOR-джобы с подпиской
    const activeJobs = await prisma.auditJob.findMany({
      where: {
        subscriptionActiveUntil: { gt: new Date() },
        status: "COMPLETED",
      },
      orderBy: { completedAt: "desc" },
    })

    // Группируем по clientEmail — берём последний аудит на клиента
    const byClient = new Map<string, typeof activeJobs[number]>()
    for (const job of activeJobs) {
      if (!MONITOR_TIERS.has(job.subscriptionTier ?? "")) continue
      if (!byClient.has(job.clientEmail)) {
        byClient.set(job.clientEmail, job)
      }
    }

    let alertsSent = 0

    for (const [email, latestJob] of byClient) {
      // Найти предыдущий завершённый аудит для этого клиента
      const previousJob = await prisma.auditJob.findFirst({
        where: {
          clientEmail: email,
          status: "COMPLETED",
          id: { not: latestJob.id },
        },
        include: { report: { select: { overallScore: true } } },
        orderBy: { completedAt: "desc" },
      })

      if (!previousJob?.report) continue

      const latestReport = await prisma.report.findUnique({
        where: { jobId: latestJob.id },
        select: { overallScore: true },
      })

      if (!latestReport) continue

      const currentScore = latestReport.overallScore
      const prevScore = previousJob.report.overallScore
      const delta = currentScore - prevScore

      if (delta <= -ALERT_THRESHOLD) {
        console.log(`[monitoring-alerts] Score drop for ${email}: ${prevScore} → ${currentScore} (${delta})`)

        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"
        const reportUrl = `${appUrl}/report/${latestJob.id}?token=${latestJob.reportToken}`

        await sendAlertEmail({
          to: email,
          companyName: latestJob.companyName,
          currentScore,
          prevScore,
          delta,
          reportUrl,
        })

        // Telegram уведомление (admin)
        notifyScoreDrop({
          companyName: latestJob.companyName,
          email,
          currentScore,
          prevScore,
          delta,
        }).catch(console.error)

        alertsSent++
      }
    }

    console.log(`[monitoring-alerts] Done. Alerts sent: ${alertsSent}/${byClient.size}`)
    return { checked: byClient.size, alertsSent }
  },
})

async function sendAlertEmail(opts: {
  to: string
  companyName: string
  currentScore: number
  prevScore: number
  delta: number
  reportUrl: string
}) {
  const { to, companyName, currentScore, prevScore, delta, reportUrl } = opts

  await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? "noreply@kaligeo.com",
    to,
    subject: `⚠ AI-видимость упала — ${companyName} | ${prevScore} → ${currentScore} (${delta})`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
  <div style="text-align:center;padding:24px 0 16px">
    <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:.1em">KaliGEO · Мониторинг</p>
    <h1 style="font-size:22px;font-weight:700;margin:8px 0 0">Падение AI-видимости</h1>
  </div>

  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:24px;margin:16px 0;text-align:center">
    <p style="margin:0 0 12px;font-size:13px;color:#9a3412;text-transform:uppercase;letter-spacing:.08em;font-weight:600">${companyName}</p>
    <div style="display:flex;justify-content:center;align-items:center;gap:20px">
      <div>
        <p style="margin:0;font-size:11px;color:#9ca3af">БЫЛО</p>
        <p style="margin:4px 0 0;font-size:48px;font-weight:700;color:#9ca3af;line-height:1">${prevScore}</p>
      </div>
      <div style="font-size:28px;font-weight:700;color:#dc2626">${delta}</div>
      <div>
        <p style="margin:0;font-size:11px;color:#9ca3af">СТАЛО</p>
        <p style="margin:4px 0 0;font-size:48px;font-weight:700;color:#dc2626;line-height:1">${currentScore}</p>
      </div>
    </div>
    <p style="margin:16px 0 0;font-size:13px;color:#7c3aed">AI-видимость снизилась на ${Math.abs(delta)} пунктов</p>
  </div>

  <p style="font-size:14px;color:#374151;line-height:1.7">
    Это может означать изменение алгоритмов AI-платформ, активность конкурентов или потерю авторитетности источников.
    Откройте отчёт, чтобы найти причину и план исправления.
  </p>

  <div style="text-align:center;margin:28px 0">
    <a href="${reportUrl}" style="display:inline-block;background:#0f172a;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
      Открыть отчёт →
    </a>
  </div>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0">
  <p style="font-size:12px;color:#9ca3af;text-align:center">
    KaliGEO · Мониторинг AI-видимости<br>
    Настроить порог уведомлений → Личный кабинет
  </p>
</body>
</html>`,
  })
}
