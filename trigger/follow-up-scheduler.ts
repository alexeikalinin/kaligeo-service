import { schedules, tasks } from "@trigger.dev/sdk/v3"
import { prisma } from "../lib/prisma"
import { auditPipeline } from "./audit-pipeline"

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

    return { processed: due.length }
  },
})
