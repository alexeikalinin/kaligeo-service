import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { auditPipeline } from "@/trigger/audit-pipeline"
import { z } from "zod"

const ConfirmSchema = z.object({
  tier: z.enum(["BASIC", "STANDARD", "ADVANCED"]).optional(),
  adminNotes: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
  if (!isAuthed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const { tier, adminNotes } = ConfirmSchema.parse(body)

  const job = await prisma.auditJob.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })

  if (job.paidAt) {
    return NextResponse.json({ error: "Уже подтверждено" }, { status: 400 })
  }

  await prisma.auditJob.update({
    where: { id },
    data: {
      paidAt: new Date(),
      status: "PENDING",
      ...(tier ? { tier } : {}),
      ...(adminNotes ? { adminNotes } : {}),
    },
  })

  await tasks.trigger<typeof auditPipeline>("audit-pipeline", { jobId: id })

  return NextResponse.json({ success: true, message: "Оплата подтверждена, аудит запущен" })
}
