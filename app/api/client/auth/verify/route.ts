import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { signSession, sessionCookieOptions } from "@/lib/client-session"

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")
  if (!token) {
    return NextResponse.redirect(new URL("/my/login?error=invalid", req.url))
  }

  const record = await prisma.magicLinkToken.findUnique({ where: { token } })

  if (!record || record.usedAt !== null || record.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/my/login?error=expired", req.url))
  }

  const client = await prisma.client.findUnique({ where: { email: record.email } })
  if (!client) {
    return NextResponse.redirect(new URL("/my/login?error=invalid", req.url))
  }

  await prisma.magicLinkToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  })

  const sessionValue = signSession(client.id)
  const cookieOpts = sessionCookieOptions()

  const response = NextResponse.redirect(new URL("/my/dashboard", req.url))
  response.cookies.set({
    ...cookieOpts,
    value: sessionValue,
  })

  return response
}
