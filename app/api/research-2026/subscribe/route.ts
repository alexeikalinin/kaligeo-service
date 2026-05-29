import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"
import { z } from "zod"

const resend = new Resend(process.env.RESEND_API_KEY)

const PDF_URL = process.env.RESEARCH_PDF_URL ?? ""
const FROM = process.env.FROM_EMAIL ?? "KaliGEO <hello@kaligeo.ru>"

const Schema = z.object({
  email: z.string().email(),
  company: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 })
  }

  const { email, company } = parsed.data

  // Сохранить лид (upsert чтобы не дублировать)
  await prisma.lead.upsert({
    where: { email } as any,
    update: { updatedAt: new Date() },
    create: {
      email,
      companyName: company ?? email.split("@")[0],
      source: "research-2026",
      status: "NEW",
    },
  }).catch(() => null) // не блокируем если лид уже есть

  // Отправить email с PDF
  const downloadSection = PDF_URL
    ? `<p style="margin:24px 0 0">
        <a href="${PDF_URL}" style="display:inline-block;background:#a3e635;color:#0f1115;border-radius:8px;padding:12px 24px;font-size:15px;font-weight:700;text-decoration:none">
          Скачать PDF →
        </a>
      </p>`
    : `<p style="color:#6b7280;font-size:14px;margin-top:16px">
        PDF-версия будет доступна в ближайшее время. Мы пришлём ссылку отдельным письмом.
      </p>`

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Ваш PDF: Состояние GEO в России 2026 — KaliGEO",
    html: `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<div style="max-width:560px;margin:40px auto;background:#fafaf7;border:1px solid #e8e8e3;border-radius:12px;overflow:hidden">
  <div style="background:#0f1115;padding:24px 32px;display:flex;align-items:center;gap:10px">
    <span style="font-family:'Courier New',monospace;font-weight:700;font-size:16px;color:#fafaf7;letter-spacing:0.05em">KALIGEO</span>
  </div>
  <div style="padding:32px">
    <h1 style="font-size:22px;font-weight:400;margin:0 0 12px;color:#0f1115;font-family:Georgia,serif">
      Состояние GEO в России 2026
    </h1>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px">
      Спасибо! Ваше исследование готово к скачиванию.
    </p>
    <p style="font-size:14px;color:#6b7280;line-height:1.65;margin:0">
      Внутри: AI-видимость 500+ компаний в 9 платформах, топ ошибок, тренды Q1–Q2 2026
      и практический чеклист для роста видимости.
    </p>
    ${downloadSection}
    <hr style="border:none;border-top:1px solid #e8e8e3;margin:32px 0">
    <p style="font-size:13px;color:#9ca3af;line-height:1.6;margin:0">
      Хотите узнать как <em>ваш бизнес</em> выглядит в AI? Запустите бесплатный аудит —
      результат за 8 минут.
      <br><br>
      <a href="https://app.kaligeo.ru/my/login" style="color:#0f1115;text-decoration:underline;text-underline-offset:3px">
        Попробовать бесплатно →
      </a>
    </p>
  </div>
  <div style="padding:16px 32px;border-top:1px solid #e8e8e3;font-size:11px;color:#9ca3af">
    KaliGEO · kaligeo.ru · Вы получили это письмо потому что запросили PDF на сайте.
  </div>
</div>
</body>
</html>`,
  })

  return NextResponse.json({ success: true })
}
