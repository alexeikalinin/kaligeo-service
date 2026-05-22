import { schedules, tasks } from "@trigger.dev/sdk/v3"
import { Resend } from "resend"
import { prisma } from "../lib/prisma"
import { auditPipeline } from "./audit-pipeline"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"

export const followUpScheduler = schedules.task({
  id: "follow-up-scheduler",
  // Запускается каждый день в 9:00 UTC
  cron: "0 9 * * *",

  run: async () => {
    const now = new Date()

    // Находим все аудиты у которых наступил срок повторного аудита
    const due = await prisma.auditJob.findMany({
      where: {
        followUpScheduledAt: { lte: now },
        followUpSentAt: null,
        status: "COMPLETED",
      },
    })

    console.log(`[follow-up-scheduler] Found ${due.length} due follow-ups`)

    for (const original of due) {
      try {
        // Создаём новый job с теми же параметрами
        const followUp = await prisma.auditJob.create({
          data: {
            clientEmail: original.clientEmail,
            websiteUrl: original.websiteUrl,
            companyName: original.companyName,
            niche: original.niche,
            competitors: original.competitors,
            tier: original.tier,
            adminNotes: `Автоматический повторный аудит. Исходный аудит: ${original.id}`,
            baselineJobId: original.id,
            paidAt: now,
            status: "PENDING",
          },
        })

        // Запускаем pipeline
        await tasks.trigger<typeof auditPipeline>("audit-pipeline", { jobId: followUp.id })

        // Помечаем исходный аудит как отправленный
        await prisma.auditJob.update({
          where: { id: original.id },
          data: { followUpSentAt: now },
        })

        console.log(`[follow-up-scheduler] Triggered follow-up ${followUp.id} for original ${original.id}`)
      } catch (err) {
        console.error(`[follow-up-scheduler] Failed for job ${original.id}:`, err)
      }
    }

    // ── Upsell: разовые аудиты без повторного, прошло 28+ дней ──────────────
    const upsellCandidates = await prisma.auditJob.findMany({
      where: {
        status: "COMPLETED",
        recurringFrequency: null,
        followUpSentAt: null,
        completedAt: { lte: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000) },
        // Ещё не получали upsell-письмо (используем followUpSentAt как флаг)
      },
      take: 50,
    })

    console.log(`[follow-up-scheduler] ${upsellCandidates.length} upsell candidates (28d+)`)

    for (const job of upsellCandidates) {
      try {
        const reportUrl = `${APP_URL}/report/${job.id}?token=${job.reportToken}`
        const monitoringUrl = `${APP_URL}/`

        await getResend().emails.send({
          from: process.env.FROM_EMAIL ?? "KaliGEO <hello@kaligeo.ru>",
          to: job.clientEmail,
          subject: `AI-видимость ${job.companyName} изменилась — проверьте`,
          html: `
            <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#1A1C22">
              <p style="margin:0 0 8px;font-size:13px;color:#6B7280;font-family:monospace;text-transform:uppercase;letter-spacing:.06em">KaliGEO · Мониторинг AI-видимости</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;line-height:1.3">
                Прошло 28 дней. AI-алгоритмы меняются каждые 2–4 недели.
              </h1>
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6">
                Аудит <strong>${job.companyName}</strong> был сделан 28+ дней назад.
                За это время AI-модели могли изменить свои ответы: ваши конкуренты активно публикуют контент
                и занимают позиции, которые вы могли занять первыми.
              </p>
              <a href="${reportUrl}" style="display:inline-block;margin-bottom:28px;padding:12px 24px;background:#1A1C22;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
                Посмотреть прошлый отчёт →
              </a>
              <div style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;padding:20px;margin-bottom:28px">
                <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#1A1C22">
                  Мониторинг Про — 9 990 ₽/мес
                </p>
                <ul style="margin:0;padding-left:20px;font-size:13px;color:#374151;line-height:1.8">
                  <li>Автоматический аудит каждый месяц</li>
                  <li>Дельта: что улучшилось / что упало</li>
                  <li>Share of Voice vs конкуренты</li>
                  <li>Алерт на email при падении видимости</li>
                </ul>
              </div>
              <a href="${monitoringUrl}" style="display:inline-block;padding:12px 24px;background:#4F7DFF;color:#fff;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">
                Подключить мониторинг →
              </a>
              <p style="margin:32px 0 0;font-size:12px;color:#9CA3AF">
                Письмо отправлено автоматически системой KaliGEO.
                Если вы не хотите получать такие письма — просто проигнорируйте.
              </p>
            </div>
          `,
        })

        // Помечаем как "уведомлён" — чтобы не слать повторно
        await prisma.auditJob.update({
          where: { id: job.id },
          data: { followUpSentAt: now },
        })

        console.log(`[follow-up-scheduler] Sent upsell email to ${job.clientEmail} for job ${job.id}`)
      } catch (err) {
        console.error(`[follow-up-scheduler] Upsell email failed for job ${job.id}:`, err)
      }
    }

    return { processed: due.length, upsellSent: upsellCandidates.length }
  },
})
