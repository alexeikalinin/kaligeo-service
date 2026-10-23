import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { z } from "zod"
import { corsOptionsResponse, getCorsHeaders } from "@/lib/cors"
import { getMarketConfig, marketFromOrigin, emailSenderHeader } from "@/lib/market"
import { checkRateLimit } from "@/lib/rate-limit"

const InquirySchema = z.object({
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
  consent: z.literal(true),
})

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"))
}

export async function POST(req: NextRequest) {
  const headers = getCorsHeaders(req.headers.get("origin"))
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (!await checkRateLimit(`rl:inquiry:${ip}`, 5, 3600)) {
    return NextResponse.json({ success: false, message: "Слишком много обращений. Напишите нам на email или попробуйте позже." }, { status: 429, headers })
  }
  try {
    const parsed = InquirySchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ success: false, message: "Укажите email для ответа, текст обращения (10–5000 символов) и согласие на обработку данных." }, { status: 400, headers })
    }
    const { email, message } = parsed.data
    await prisma.serviceInquiry.create({ data: { kind: "inquiry", payload: { email, message, consent: true, origin: req.headers.get("origin") } } })
    const config = getMarketConfig(marketFromOrigin(req.headers.get("origin")))
    const resend = new Resend(process.env.RESEND_API_KEY)
    const { error } = await resend.emails.send({
      from: emailSenderHeader(config.fromEmail),
      to: process.env.ADMIN_EMAIL || "1alexeikalinin1@gmail.com",
      replyTo: email,
      subject: `Обращение с ${config.landingUrl.replace("https://", "")}`,
      text: `Email для ответа: ${email}\n\n${message}`,
    })
    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true, message: "Обращение отправлено. Ответим на указанную почту." }, { headers })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ success: false, message: "Некорректные данные обращения." }, { status: 400, headers })
    }
    console.error("[inquiry] delivery failed")
    return NextResponse.json({ success: false, message: "Не удалось отправить обращение. Попробуйте позже или напишите на email." }, { status: 502, headers })
  }
}
