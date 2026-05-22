import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { checkRateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  const allowed = await checkRateLimit(`rl:admin:${ip}`, 5, 900) // 5 attempts per 15 min
  if (!allowed) {
    return NextResponse.json({ error: "Слишком много попыток. Попробуйте через 15 минут." }, { status: 429 })
  }

  const { password } = await req.json()

  if (password !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 })
  }

  const cookieStore = await cookies()
  cookieStore.set("admin_session", process.env.ADMIN_SESSION_TOKEN ?? "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  return NextResponse.json({ success: true })
}
