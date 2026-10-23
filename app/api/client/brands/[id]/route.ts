import { brandProfileSchema } from "@/lib/brand-profile-schema"
import { NextRequest, NextResponse } from "next/server"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"

async function ownsProfile(clientId: string, id: string) {
  const profile = await prisma.brandProfile.findUnique({
    where: { id },
    select: { clientId: true },
  })
  return profile?.clientId === clientId
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientId = await getClientSession()
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!(await ownsProfile(clientId, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const parsed = brandProfileSchema.partial().safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Проверьте поля профиля" }, { status: 400 })
  const brand = await prisma.brandProfile.update({ where: { id }, data: parsed.data })
  return NextResponse.json({ brand })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const clientId = await getClientSession()
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  if (!(await ownsProfile(clientId, id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.brandProfile.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
