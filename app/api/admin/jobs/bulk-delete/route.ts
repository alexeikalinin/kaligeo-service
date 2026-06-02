import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ids } = await req.json() as { ids: string[] }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 })
  }

  await prisma.queryResult.deleteMany({ where: { jobId: { in: ids } } })
  await prisma.report.deleteMany({ where: { jobId: { in: ids } } })
  const { count } = await prisma.auditJob.deleteMany({ where: { id: { in: ids } } })

  return NextResponse.json({ ok: true, deleted: count })
}
