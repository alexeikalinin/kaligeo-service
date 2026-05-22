/**
 * monitoring — scheduled Trigger.dev task для еженедельного spot-check видимости.
 *
 * Находит аудиты с recurringFrequency = "weekly" | "monthly" | "quarterly"
 * у которых прошёл соответствующий период с последней проверки.
 *
 * При падении alertLevel = "warn" | "critical" отправляет уведомление клиенту
 * и в Telegram-канал администратора.
 */

import { schedules } from "@trigger.dev/sdk/v3"
import { Resend } from "resend"
import { prisma } from "../lib/prisma"
import { runMonitoringAgent, type MonitoringResult } from "../lib/agents/monitoring-agent"
import { tg } from "../lib/telegram"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}

const FROM = () => process.env.FROM_EMAIL ?? "noreply@kaligeo.com"
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"
const ADMIN_TG_CHAT = () => process.env.ADMIN_TELEGRAM_CHAT_ID ?? ""

export const monitoringTask = schedules.task({
  id: "monitoring-spot-check",
  // Запускается каждый день в 8:00 UTC, сам решает кого проверять
  cron: "0 8 * * *",
  maxDuration: 600,

  run: async () => {
    const now = new Date()
    const results: { jobId: string; companyName: string; alertLevel: string }[] = []

    // Находим аудиты с настроенным мониторингом
    const monitoredJobs = await prisma.auditJob.findMany({
      where: {
        recurringFrequency: { in: ["weekly", "monthly", "quarterly"] },
        status: "COMPLETED",
      },
      select: {
        id: true,
        companyName: true,
        clientEmail: true,
        reportToken: true,
        recurringFrequency: true,
        completedAt: true,
        followUpSentAt: true,  // используем как "последняя проверка мониторинга"
        tier: true,
      },
    })

    console.log(`[monitoring] Проверяем ${monitoredJobs.length} аудитов с мониторингом`)

    for (const job of monitoredJobs) {
      // Определяем нужно ли проверять сейчас
      const lastCheck = job.followUpSentAt ?? job.completedAt
      if (!lastCheck) continue

      const daysSinceCheck = Math.floor(
        (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24)
      )

      const intervalDays = {
        weekly: 7,
        monthly: 30,
        quarterly: 90,
      }[job.recurringFrequency!] ?? 30

      if (daysSinceCheck < intervalDays) continue  // ещё рано

      try {
        console.log(`[monitoring] Spot-check для ${job.companyName} (${job.id})`)

        const result = await runMonitoringAgent(job.id)
        results.push({ jobId: job.id, companyName: job.companyName, alertLevel: result.alertLevel })

        // Отправляем уведомление если есть падение
        if (result.alertLevel !== "ok") {
          await sendAlertEmail(job.clientEmail, job.id, job.reportToken, result)
          await sendAdminTgAlert(job.companyName, result)
        }

        // Обновляем время последней проверки
        await prisma.auditJob.update({
          where: { id: job.id },
          data: { followUpSentAt: now },
        })
      } catch (err) {
        console.error(`[monitoring] Ошибка для ${job.id}:`, err)
      }
    }

    const warns = results.filter((r) => r.alertLevel === "warn").length
    const criticals = results.filter((r) => r.alertLevel === "critical").length

    console.log(
      `[monitoring] Готово. Проверено: ${results.length}, предупреждений: ${warns}, критических: ${criticals}`
    )

    return { checked: results.length, warns, criticals }
  },
})

async function sendAlertEmail(
  to: string,
  jobId: string,
  reportToken: string,
  result: MonitoringResult
) {
  const reportUrl = `${APP_URL()}/report/${jobId}?token=${reportToken}`
  const emoji = result.alertLevel === "critical" ? "🔴" : "🟡"
  const subject =
    result.alertLevel === "critical"
      ? `${emoji} Критическое падение AI-видимости — ${result.companyName}`
      : `${emoji} Снижение AI-видимости — ${result.companyName}`

  const platformRows = result.platformResults
    .filter((p) => p.delta < 0)
    .map(
      (p) =>
        `<tr>
          <td style="padding:6px 12px;">${p.platform}</td>
          <td style="padding:6px 12px;">${Math.round(p.mentionRateBefore * 100)}%</td>
          <td style="padding:6px 12px;color:#ef4444;">${Math.round(p.mentionRateNow * 100)}%</td>
          <td style="padding:6px 12px;color:#ef4444;">${Math.round(p.delta * 100)}%</td>
        </tr>`
    )
    .join("\n")

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;">

<div style="background:${result.alertLevel === "critical" ? "#fef2f2" : "#fef9f0"};border-radius:12px;padding:24px;margin-bottom:20px;">
  <h2 style="margin:0 0 8px;font-size:20px;">${emoji} Мониторинг AI-видимости</h2>
  <p style="margin:0;color:#6b7280;font-size:14px;">${result.companyName} · ${new Date(result.checkedAt).toLocaleDateString("ru")}</p>
</div>

<p style="font-size:15px;">${result.summary}</p>

<div style="display:flex;gap:16px;margin:20px 0;">
  <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;">
    <div style="font-size:32px;font-weight:700;">${result.baselineScore}</div>
    <div style="font-size:12px;color:#6b7280;">Базовый score</div>
  </div>
  <div style="flex:1;background:#f9fafb;border-radius:8px;padding:16px;text-align:center;">
    <div style="font-size:32px;font-weight:700;color:${result.scoreDelta < 0 ? "#ef4444" : "#22c55e"};">${result.estimatedCurrentScore}</div>
    <div style="font-size:12px;color:#6b7280;">Текущий (оценка) · ${result.scoreDelta > 0 ? "+" : ""}${result.scoreDelta}</div>
  </div>
</div>

${platformRows ? `<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
  <thead>
    <tr style="background:#f3f4f6;">
      <th style="text-align:left;padding:8px 12px;">Платформа</th>
      <th style="text-align:left;padding:8px 12px;">До</th>
      <th style="text-align:left;padding:8px 12px;">Сейчас</th>
      <th style="text-align:left;padding:8px 12px;">Δ</th>
    </tr>
  </thead>
  <tbody>${platformRows}</tbody>
</table>` : ""}

<div style="text-align:center;margin:28px 0;">
  <a href="${reportUrl}" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
    Открыть отчёт →
  </a>
</div>

<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
<p style="color:#9ca3af;font-size:11px;text-align:center;">KaliGEO · Автоматический мониторинг AI-видимости</p>
</body></html>`

  try {
    await getResend().emails.send({ from: FROM(), to, subject, html })
  } catch (err) {
    console.error(`[monitoring] Ошибка отправки алерта на ${to}:`, err)
  }
}

async function sendAdminTgAlert(companyName: string, result: MonitoringResult) {
  const chatId = ADMIN_TG_CHAT()
  if (!chatId) return

  const emoji = result.alertLevel === "critical" ? "🔴" : "🟡"
  const msg = `${emoji} <b>Мониторинг: ${companyName}</b>
Score: ${result.baselineScore} → ${result.estimatedCurrentScore} (${result.scoreDelta > 0 ? "+" : ""}${result.scoreDelta})
${result.summary}`

  await tg.send(chatId, msg)
}
