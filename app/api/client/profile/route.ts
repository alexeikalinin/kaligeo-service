import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"

const ProfileSchema = z.object({
  displayName: z.string().trim().max(100),
  companyName: z.string().trim().min(1).max(100),
})

export async function PATCH(req: NextRequest) {
  const clientId = await getClientSession()
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const parsed = ProfileSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Проверьте имя и название компании." }, { status: 400 })
  await prisma.client.update({
    where: { id: clientId },
    data: { displayName: parsed.data.displayName || null, companyName: parsed.data.companyName },
  })
  return NextResponse.json({ success: true })
}
