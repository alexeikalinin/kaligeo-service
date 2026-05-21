import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAvailableFrequencies, type RecurringFrequency } from "@/lib/gates"

const FREQUENCY_DAYS: Record<RecurringFrequency, number> = {
  weekly: 7,
  monthly: 30,
  quarterly: 90,
}

/**
 * POST /api/audit/[id]/schedule?token=X
 * Body: { frequency: "weekly" | "monthly" | "quarterly" }
 *
 * Включает автоматический повторный аудит.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get("token")
  const body = await req.json().catch(() => ({}))
  const frequency = body.frequency as RecurringFrequency | undefined

  if (!token) return NextResponse.json({ error: "Token required" }, { status: 401 })
  if (!frequency || !["weekly", "monthly", "quarterly"].includes(frequency)) {
    return NextResponse.json({ error: "Invalid frequency" }, { status: 400 })
  }

  const job = await prisma.auditJob.findUnique({
    where: { id },
    select: { reportToken: true, tier: true, status: true },
  })

  if (!job || job.reportToken !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (job.status !== "COMPLETED") {
    return NextResponse.json({ error: "Audit not completed" }, { status: 400 })
  }

  // Проверяем, доступна ли такая частота для тарифа
  const available = getAvailableFrequencies(job.tier as any)
  if (!available.includes(frequency)) {
    return NextResponse.json(
      { error: `Frequency '${frequency}' not available on ${job.tier} plan` },
      { status: 403 }
    )
  }

  const days = FREQUENCY_DAYS[frequency]
  const followUpScheduledAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  await prisma.auditJob.update({
    where: { id },
    data: {
      recurringFrequency: frequency,
      followUpScheduledAt,
      followUpSentAt: null, // сброс чтобы scheduler подхватил
    },
  })

  return NextResponse.json({
    ok: true,
    recurringFrequency: frequency,
    followUpScheduledAt,
  })
}

/**
 * DELETE /api/audit/[id]/schedule?token=X
 *
 * Отключает автоматический повторный аудит.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get("token")

  if (!token) return NextResponse.json({ error: "Token required" }, { status: 401 })

  const job = await prisma.auditJob.findUnique({
    where: { id },
    select: { reportToken: true },
  })

  if (!job || job.reportToken !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  await prisma.auditJob.update({
    where: { id },
    data: {
      recurringFrequency: null,
      followUpScheduledAt: null,
    },
  })

  return NextResponse.json({ ok: true })
}

/**
 * GET /api/audit/[id]/schedule?token=X
 *
 * Возвращает текущий статус расписания.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get("token")

  if (!token) return NextResponse.json({ error: "Token required" }, { status: 401 })

  const job = await prisma.auditJob.findUnique({
    where: { id },
    select: { reportToken: true, tier: true, recurringFrequency: true, followUpScheduledAt: true },
  })

  if (!job || job.reportToken !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    recurringFrequency: job.recurringFrequency,
    followUpScheduledAt: job.followUpScheduledAt,
    availableFrequencies: getAvailableFrequencies(job.tier as any),
  })
}
