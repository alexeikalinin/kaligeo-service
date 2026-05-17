import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { auditPipeline } from "@/trigger/audit-pipeline"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
  if (!isAuthed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const job = await prisma.auditJob.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 })
  if (job.status !== "FAILED") {
    return NextResponse.json({ error: "Можно перезапустить только упавший аудит" }, { status: 400 })
  }

  await prisma.auditJob.update({
    where: { id },
    data: { status: "PENDING", errorMessage: null },
  })

  await tasks.trigger<typeof auditPipeline>("audit-pipeline", { jobId: id })

  return NextResponse.json({ success: true })
}
