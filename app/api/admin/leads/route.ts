import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
}

// DELETE /api/admin/leads — удалить freemium-сканы по массиву id
// Body: { ids: string[] }
export async function DELETE(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const ids: string[] = Array.isArray(body?.ids) ? body.ids : []

  if (ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 })
  }

  const { count } = await prisma.freemiumScan.deleteMany({
    where: { id: { in: ids } },
  })

  return NextResponse.json({ deleted: count })
}
