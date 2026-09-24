import { NextResponse } from "next/server"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"

export async function POST() {
  const clientId = await getClientSession()
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const subscription = await prisma.subscription.findFirst({
    where: { clientId, status: { in: ["ACTIVE", "PAST_DUE", "PENDING_FIRST_PAYMENT"] } },
    orderBy: { createdAt: "desc" },
  })

  if (!subscription) {
    return NextResponse.json({ error: "Активная подписка не найдена" }, { status: 404 })
  }

  // Access stays until the already-paid period ends — subscription-billing.ts only
  // picks up status "ACTIVE", so it simply won't charge again.
  const updated = await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "CANCELED", canceledAt: new Date() },
  })

  return NextResponse.json({ subscription: updated })
}
