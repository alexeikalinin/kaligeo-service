import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { tg } from "@/lib/telegram"

// Вызывается один раз после деплоя для регистрации webhook
export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
  if (!isAuthed) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (!appUrl || !secret) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL или TELEGRAM_WEBHOOK_SECRET не заданы" }, { status: 500 })
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`
  const result = await tg.setWebhook(webhookUrl, secret)

  return NextResponse.json({ webhookUrl, result })
}
