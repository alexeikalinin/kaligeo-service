import { Resend } from "resend"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}

async function sendTelegram(text: string): Promise<void> {
  const token = process.env.ADMIN_TELEGRAM_BOT_TOKEN
  const chatId = process.env.ADMIN_TELEGRAM_CHAT_ID
  if (!token || !chatId) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    })
  } catch {
    // non-fatal
  }
}

async function sendAdminEmail(subject: string, html: string): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !process.env.RESEND_API_KEY) return
  try {
    await getResend().emails.send({
      from: process.env.FROM_EMAIL ?? "noreply@kaligeo.com",
      to: adminEmail,
      subject,
      html,
    })
  } catch {
    // non-fatal
  }
}

function row(label: string, value: string) {
  return `<tr><td style="color:#888;padding:4px 12px 4px 0;white-space:nowrap">${label}</td><td style="color:#eee">${value}</td></tr>`
}

function adminBase(body: string) {
  return `<div style="font-family:monospace;background:#0f172a;color:#e2e8f0;padding:24px;border-radius:8px;max-width:560px">${body}</div>`
}

// ── New audit request (PENDING_PAYMENT) ──────────────────────────────────────

export async function notifyNewAuditRequest(opts: {
  companyName: string
  clientEmail: string
  websiteUrl: string
  tier: string
  clientNumber: number | null
  jobId: string
}) {
  const { companyName, clientEmail, websiteUrl, tier, clientNumber, jobId } = opts
  const clientTag = clientNumber ? `KG-${String(clientNumber).padStart(3, "0")}` : "новый"
  const adminUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin`

  const tg = [
    `📥 <b>Новая заявка</b>`,
    `Клиент: ${clientTag} · ${companyName}`,
    `Тариф: ${tier}`,
    `Email: ${clientEmail}`,
    `Сайт: ${websiteUrl}`,
    `👉 Подтвердить оплату: ${adminUrl}`,
  ].join("\n")
  await sendTelegram(tg)

  const html = adminBase(`
    <h2 style="margin:0 0 16px;font-size:18px">📥 Новая заявка на аудит</h2>
    <table style="border-collapse:collapse">
      ${row("Клиент", `${clientTag} · ${companyName}`)}
      ${row("Email", clientEmail)}
      ${row("Сайт", websiteUrl)}
      ${row("Тариф", tier)}
      ${row("Job ID", jobId)}
    </table>
    <div style="margin-top:20px">
      <a href="${adminUrl}" style="background:#facc15;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
        Подтвердить оплату →
      </a>
    </div>
  `)
  await sendAdminEmail(`📥 Новая заявка: ${companyName} [${tier}]`, html)
}

// ── Audit started (payment confirmed) ────────────────────────────────────────

export async function notifyAuditStarted(opts: {
  companyName: string
  tier: string
  jobId: string
}) {
  const { companyName, tier, jobId } = opts
  const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/jobs/${jobId}`

  const tg = `▶️ <b>Аудит запущен</b>\n${companyName} · ${tier}\n${jobUrl}`
  await sendTelegram(tg)
}

// ── Audit completed ───────────────────────────────────────────────────────────

export async function notifyAuditCompleted(opts: {
  companyName: string
  clientEmail: string
  tier: string
  overallScore: number
  reportUrl: string
  jobId: string
  isFollowUp?: boolean
}) {
  const { companyName, clientEmail, tier, overallScore, reportUrl, isFollowUp } = opts
  const emoji = overallScore >= 60 ? "🟢" : overallScore >= 30 ? "🟡" : "🔴"
  const label = isFollowUp ? "Повторный аудит готов" : "Аудит готов"

  const tg = [
    `${emoji} <b>${label}</b>`,
    `${companyName} · ${tier}`,
    `Score: ${overallScore}/100`,
    `Email клиента: ${clientEmail}`,
    `Отчёт: ${reportUrl}`,
  ].join("\n")
  await sendTelegram(tg)

  const html = adminBase(`
    <h2 style="margin:0 0 16px;font-size:18px">${emoji} ${label}</h2>
    <table style="border-collapse:collapse">
      ${row("Компания", companyName)}
      ${row("Email", clientEmail)}
      ${row("Тариф", tier)}
      ${row("Score", `${overallScore}/100`)}
    </table>
    <div style="margin-top:20px">
      <a href="${reportUrl}" style="background:#22c55e;color:#000;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
        Открыть отчёт →
      </a>
    </div>
  `)
  await sendAdminEmail(`${emoji} ${label}: ${companyName} — ${overallScore}/100`, html)
}

// ── Audit failed ──────────────────────────────────────────────────────────────

export async function notifyAuditFailed(opts: {
  companyName: string
  tier: string
  jobId: string
  errorMessage?: string
}) {
  const { companyName, tier, jobId, errorMessage } = opts
  const jobUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/jobs/${jobId}`

  const tg = [
    `🔴 <b>Аудит упал</b>`,
    `${companyName} · ${tier}`,
    errorMessage ? `Ошибка: ${errorMessage.slice(0, 200)}` : "",
    jobUrl,
  ].filter(Boolean).join("\n")
  await sendTelegram(tg)

  const html = adminBase(`
    <h2 style="margin:0 0 16px;font-size:18px">🔴 Аудит упал</h2>
    <table style="border-collapse:collapse">
      ${row("Компания", companyName)}
      ${row("Тариф", tier)}
      ${row("Job ID", jobId)}
      ${errorMessage ? row("Ошибка", `<span style="color:#f87171">${errorMessage.slice(0, 400)}</span>`) : ""}
    </table>
    <div style="margin-top:20px">
      <a href="${jobUrl}" style="background:#ef4444;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:bold">
        Перезапустить →
      </a>
    </div>
  `)
  await sendAdminEmail(`🔴 Аудит упал: ${companyName}`, html)
}
