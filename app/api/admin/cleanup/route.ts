/**
 * DELETE /api/admin/cleanup
 * Bulk-deletes test/fake audit jobs. Admin only.
 * Deletes jobs matching test email patterns or explicit companyName "KaliGEO Test".
 */
import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
}

export async function DELETE(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Find test jobs by email pattern or company name
  const testJobs = await prisma.auditJob.findMany({
    where: {
      OR: [
        { companyName: "KaliGEO Test" },
        { companyName: "Andersen" },
        { companyName: "GamePark" },
        { companyName: "Test Co" },
        { companyName: "Hacker" },
        { clientEmail: { contains: "test@" } },
        { clientEmail: { contains: "hack@" } },
      ],
    },
    select: { id: true, companyName: true, clientEmail: true },
  })

  const ids = testJobs.map((j) => j.id)

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, deleted: 0 })
  }

  // Delete related records
  await prisma.queryResult.deleteMany({ where: { jobId: { in: ids } } })
  await prisma.report.deleteMany({ where: { jobId: { in: ids } } })
  await prisma.auditJob.deleteMany({ where: { id: { in: ids } } })

  return NextResponse.json({
    ok: true,
    deleted: ids.length,
    jobs: testJobs.map((j) => `${j.companyName} <${j.clientEmail}>`),
  })
}
