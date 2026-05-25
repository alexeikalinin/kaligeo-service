/**
 * DELETE /api/admin/jobs/[id]
 * Deletes an audit job (admin only). Used for cleanup of test jobs.
 */
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const job = await prisma.auditJob.findUnique({ where: { id } })
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Delete related records first
  await prisma.queryResult.deleteMany({ where: { jobId: id } })
  await prisma.report.deleteMany({ where: { jobId: id } })
  await prisma.auditJob.delete({ where: { id } })

  return NextResponse.json({ ok: true, deleted: id })
}
