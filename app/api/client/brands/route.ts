import { brandProfileSchema } from "@/lib/brand-profile-schema"
import { NextRequest, NextResponse } from "next/server"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const clientId = await getClientSession()
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const brands = await prisma.brandProfile.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ brands })
}

export async function POST(req: NextRequest) {
  const clientId = await getClientSession()
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const parsed = brandProfileSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Проверьте название, адрес сайта и поля профиля" }, { status: 400 })
  const data = parsed.data
  const brand = await prisma.brandProfile.create({ data: {
    ...data, clientId,
    niche: data.niche ?? "", alternativeNames: data.alternativeNames ?? [], competitors: data.competitors ?? [], customPrompts: data.customPrompts ?? [],
  } })
  return NextResponse.json({ brand }, { status: 201 })
}
