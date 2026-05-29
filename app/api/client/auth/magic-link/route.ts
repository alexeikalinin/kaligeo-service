import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkRateLimit } from "@/lib/rate-limit"
import { sendMagicLinkEmail } from "@/lib/notify"

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  const allowed = await checkRateLimit(`rl:magic:${ip}`, 3, 300) // 3 attempts per 5 min
  if (!allowed) {
    return NextResponse.json(
      { error: "Слишком много попыток. Попробуйте через 5 минут." },
      { status: 429 }
    )
  }

  const body = await req.json()
  const email = (body?.email ?? "").trim().toLowerCase()
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 })
  }

  // Find or create client — anyone can log in, account is created on first login
  let client = await prisma.client.findUnique({ where: { email } })
  if (!client) {
    client = await prisma.client.create({
      data: {
        email,
        companyName: email.split("@")[0], // placeholder, can be updated later
      },
    })
  }

  // Invalidate old unused tokens for this email
  await prisma.magicLinkToken.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date(0) }, // mark as used with epoch
  })

  const token = await prisma.magicLinkToken.create({
    data: {
      email,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"
  const magicLinkUrl = `${appUrl}/api/client/auth/verify?token=${token.token}`

  await sendMagicLinkEmail({ to: email, magicLinkUrl })

  return NextResponse.json({ success: true })
}
