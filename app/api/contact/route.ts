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
import { tasks } from "@trigger.dev/sdk/v3"
import { tg } from "@/lib/telegram"
import type { contactScan } from "@/trigger/contact-scan"

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM    = process.env.FROM_EMAIL ?? "hello@kaligeo.ru"
const ADMIN   = process.env.ADMIN_EMAIL ?? "1alexeikalinin1@gmail.com"
const ADMIN_TG = process.env.ADMIN_TELEGRAM_CHAT_ID ?? ""

const CORS_ORIGINS = ["https://kaligeo.ru", "https://kaligeo.by"]

function corsHeaders(origin: string | null) {
  const allowed = CORS_ORIGINS.includes(origin ?? "") ? origin! : CORS_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
  }
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin")
  return new Response(null, { status: 204, headers: corsHeaders(origin) })
}

export async function POST(req: NextRequest) {
  const reqOrigin = req.headers.get("origin")
  const headers = corsHeaders(reqOrigin)

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
    return NextResponse.json({ success: false, message: "Некорректный email" }, { status: 400, headers })
  }
  if (!name && !website) {
    return NextResponse.json({ success: false, message: "Заполните имя или сайт" }, { status: 400, headers })
  }

  const domain = origin.includes("kaligeo.by") ? "kaligeo.by" : "kaligeo.ru"
  const planLabel = plan || "не выбран"

  try {
    // 1. Email уведомление администратору
    const { error: adminErr } = await resend.emails.send({
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
    if (adminErr) throw new Error(`Resend admin: ${adminErr.message}`)

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
    const { error: clientErr } = await resend.emails.send({
      from: FROM,
      to: email,
      subject: "Запускаем AI-скан вашего сайта — KaliGEO",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
          <div style="text-align:center;padding:24px 0 16px">
            <span style="font-family:monospace;font-weight:700;font-size:13px;letter-spacing:0.1em;text-transform:uppercase">KaliGEO</span>
          </div>
          <h2 style="color:#0f1115;margin:0 0 12px">Заявка принята — скан запущен!</h2>
          <p style="color:#374151;line-height:1.7">Здравствуйте${name ? `, <b>${name}</b>` : ""}!</p>
          <p style="color:#374151;line-height:1.7">
            Мы уже запустили бесплатное AI-сканирование${website ? ` сайта <b>${website}</b>` : ""} —
            проверяем как ChatGPT, Gemini, Perplexity и другие AI-системы упоминают ваш бизнес.
          </p>
          <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:24px 0;text-align:center">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280">Результаты будут готовы через</p>
            <p style="margin:0;font-size:28px;font-weight:700;color:#0f1115">3–5 минут</p>
            <p style="margin:8px 0 0;font-size:13px;color:#6b7280">Мы пришлём отдельное письмо с вашим AI-индексом и разбивкой по платформам</p>
          </div>
          <p style="color:#374151;line-height:1.7">Пока ждёте — посмотрите как выглядит полный отчёт:</p>
          <div style="text-align:center;margin:20px 0">
            <a href="https://app.kaligeo.ru/report/demo" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
              Пример полного отчёта →
            </a>
          </div>
          <p style="color:#374151;line-height:1.7;font-size:14px">
            Письмо с результатами придёт отдельно — там будет ваш AI-индекс и разбивка по платформам.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
          <p style="color:#9ca3af;font-size:12px;text-align:center">KaliGEO · <a href="https://${domain}" style="color:#9ca3af">${domain}</a> · <a href="mailto:hello@kaligeo.ru" style="color:#9ca3af">hello@kaligeo.ru</a></p>
        </div>
      `,
    })
    if (clientErr) console.error("[contact] client email error:", clientErr.message)

    // Trigger background freemium scan → sends results email in ~15 min
    if (website) {
      try {
        const url = new URL(website)
        await tasks.trigger<typeof contactScan>("contact-scan", {
          websiteUrl: url.toString(),
          email,
          name,
        })
      } catch (e) {
        console.error("[contact] contact-scan trigger failed:", e)
      }
    }

    return NextResponse.json({ success: true, message: "Заявка принята" }, { headers })

  } catch (err) {
    console.error("[contact] Error:", err)
    return NextResponse.json({ success: false, message: "Ошибка отправки" }, { status: 500, headers })
  }
}
