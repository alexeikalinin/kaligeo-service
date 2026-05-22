/**
 * POST /api/contact
 *
 * Приём заявок с лендингов kaligeo.ru и kaligeo.by.
 * Отправляет email через Resend + уведомление в Telegram.
 * Заменяет Web3Forms (который блокирует server-side запросы).
 *
 * Body (JSON или FormData):
 *   name      string — имя / компания
 *   email     string — email клиента
 *   website   string — URL сайта
 *   phone?    string — телефон
 *   plan?     string — выбранный тариф
 */

import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { tg } from "@/lib/telegram"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM    = process.env.FROM_EMAIL ?? "hello@kaligeo.ru"
const ADMIN   = process.env.ADMIN_EMAIL ?? "1alexeikalinin1@gmail.com"
const ADMIN_TG = process.env.ADMIN_TELEGRAM_CHAT_ID ?? ""

export async function POST(req: NextRequest) {
  // Accept both JSON and FormData
  let name = "", email = "", website = "", phone = "", plan = "", origin = ""

  const ct = req.headers.get("content-type") ?? ""
  if (ct.includes("application/json")) {
    const body = await req.json()
    name    = body.name    ?? ""
    email   = body.email   ?? ""
    website = body.website ?? ""
    phone   = body.phone   ?? ""
    plan    = body.plan    ?? ""
    origin  = body.origin  ?? req.headers.get("origin") ?? ""
  } else {
    const fd = await req.formData()
    name    = String(fd.get("name")    ?? "")
    email   = String(fd.get("email")   ?? "")
    website = String(fd.get("website") ?? "")
    phone   = String(fd.get("phone")   ?? "")
    plan    = String(fd.get("plan")    ?? "")
    origin  = req.headers.get("origin") ?? ""
  }

  // Validate
  if (!email || !email.includes("@")) {
    return NextResponse.json({ success: false, message: "Некорректный email" }, { status: 400 })
  }
  if (!name && !website) {
    return NextResponse.json({ success: false, message: "Заполните имя или сайт" }, { status: 400 })
  }

  const domain = origin.includes("kaligeo.by") ? "kaligeo.by" : "kaligeo.ru"
  const planLabel = plan || "не выбран"

  try {
    // 1. Email уведомление администратору
    await resend.emails.send({
      from: FROM,
      to: ADMIN,
      subject: `Новая заявка: ${planLabel} — ${name || website}`,
      html: `
        <h2>Новая заявка с ${domain}</h2>
        <table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif">
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><b>Имя / Компания</b></td><td style="padding:8px;border:1px solid #ddd">${name || "—"}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><b>Email</b></td><td style="padding:8px;border:1px solid #ddd"><a href="mailto:${email}">${email}</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><b>Сайт</b></td><td style="padding:8px;border:1px solid #ddd"><a href="${website}">${website || "—"}</a></td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><b>Телефон</b></td><td style="padding:8px;border:1px solid #ddd">${phone || "—"}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><b>Тариф</b></td><td style="padding:8px;border:1px solid #ddd">${planLabel}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;background:#f9f9f9"><b>Источник</b></td><td style="padding:8px;border:1px solid #ddd">${domain}</td></tr>
        </table>
      `,
    })

    // 2. Telegram уведомление
    if (ADMIN_TG) {
      await tg.send(
        ADMIN_TG,
        [
          `📥 <b>Новая заявка с ${domain}</b>`,
          "",
          `👤 <b>${name || "—"}</b>`,
          `📧 ${email}`,
          `🌐 ${website || "—"}`,
          `📞 ${phone || "—"}`,
          `💳 Тариф: <b>${planLabel}</b>`,
        ].join("\n")
      ).catch(console.error)
    }

    // 3. Подтверждение клиенту
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Заявка принята — KaliGEO",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <h2 style="color:#0f1115">Ваша заявка принята!</h2>
          <p>Здравствуйте${name ? `, <b>${name}</b>` : ""}!</p>
          <p>Мы получили вашу заявку на <b>${planLabel}</b> и свяжемся с вами в течение нескольких часов.</p>
          <p>Пока ждёте — вы можете посмотреть <a href="https://app.kaligeo.ru/report/demo">пример отчёта</a>.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#888;font-size:13px">KaliGEO · <a href="https://${domain}" style="color:#888">${domain}</a> · <a href="mailto:hello@kaligeo.ru" style="color:#888">hello@kaligeo.ru</a></p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, message: "Заявка принята" })

  } catch (err) {
    console.error("[contact] Error:", err)
    return NextResponse.json({ success: false, message: "Ошибка отправки" }, { status: 500 })
  }
}
