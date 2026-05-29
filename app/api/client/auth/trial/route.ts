/**
 * POST /api/client/auth/trial
 *
 * Регистрация нового клиента + запуск 1 бесплатного BASIC-аудита.
 * Если клиент уже использовал trial → 409.
 * После создания job → magic-link для автологина в ЛК.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { auditPipeline } from "@/trigger/audit-pipeline"
import { sendMagicLinkEmail } from "@/lib/notify"
import { z } from "zod"

const TrialSchema = z.object({
  email: z.string().email(),
  companyName: z.string().min(1).max(100),
  websiteUrl: z.string().url(),
  niche: z.string().max(200).default(""),
  competitors: z.array(z.string()).max(5).default([]),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = TrialSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  const { email, companyName, websiteUrl, niche, competitors } = parsed.data

  // Найти или создать клиента
  let client = await prisma.client.findUnique({ where: { email } })

  if (client?.trialUsed) {
    return NextResponse.json(
      { error: "Бесплатный аудит уже использован. Войдите в личный кабинет для заказа нового." },
      { status: 409 }
    )
  }

  if (!client) {
    client = await prisma.client.create({
      data: { email, companyName, websiteUrl },
    })
  }

  // Создать BASIC job с paidAt = now (обходим проверку оплаты)
  const job = await prisma.auditJob.create({
    data: {
      clientEmail: email,
      clientId: client.id,
      companyName,
      websiteUrl,
      niche,
      competitors,
      tier: "BASIC",
      source: "trial",
      paidAt: new Date(),
      status: "PENDING",
    },
  })

  // Пометить trial как использованный
  await prisma.client.update({
    where: { id: client.id },
    data: { trialUsed: true },
  })

  // Запустить пайплайн
  await tasks.trigger<typeof auditPipeline>("audit-pipeline", { jobId: job.id })

  // Magic-link для автологина
  await prisma.magicLinkToken.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date(0) },
  })
  const tokenRecord = await prisma.magicLinkToken.create({
    data: { email, expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"
  const magicLinkUrl = `${appUrl}/api/client/auth/verify?token=${tokenRecord.token}&redirect=/my/dashboard`

  await sendMagicLinkEmail({ to: email, magicLinkUrl }).catch(console.error)

  return NextResponse.json({ success: true, jobId: job.id, magicLinkUrl })
}
