import { Resend } from "resend"

// Lazy init — env vars are loaded at runtime, not at import time
function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}

export interface DeliveryOptions {
  to: string
  companyName: string
  overallScore: number
  reportUrl: string
  pdfUrl?: string
  hasActionPlan?: boolean  // true for STANDARD/ADVANCED — меняет subject
  quickWins?: string[]     // top-3 шага из action plan для тела письма
}

export interface FollowUpDeliveryOptions {
  to: string
  companyName: string
  overallScore: number
  baselineScore: number
  reportUrl: string
  pdfUrl?: string
}

export async function sendFollowUpEmail(opts: FollowUpDeliveryOptions): Promise<void> {
  const { to, companyName, overallScore, baselineScore, reportUrl, pdfUrl } = opts
  const delta = overallScore - baselineScore
  const deltaStr = delta > 0 ? `+${delta}` : `${delta}`
  const deltaColor = delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : "#666"
  const scoreEmoji = overallScore >= 60 ? "🟢" : overallScore >= 30 ? "🟡" : "🔴"

  await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? "noreply@kaligeo.com",
    to,
    subject: `Ежемесячный AI-аудит готов — ${companyName} | Score: ${overallScore}/100 (${deltaStr})`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="text-align: center; padding: 32px 0;">
    <h1 style="font-size: 28px; font-weight: 700; margin: 0;">KaliGEO</h1>
    <p style="color: #666; margin: 8px 0 0;">Ежемесячный мониторинг AI-видимости</p>
  </div>

  <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin: 24px 0; text-align: center;">
    <p style="margin: 0 0 16px; color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Динамика AI Score</p>
    <div style="display: flex; justify-content: center; align-items: center; gap: 24px;">
      <div>
        <p style="margin: 0 0 4px; color: #999; font-size: 12px;">БЫЛО</p>
        <div style="font-size: 48px; font-weight: 700; color: #999; line-height: 1;">${baselineScore}</div>
      </div>
      <div style="font-size: 28px; font-weight: 700; color: ${deltaColor};">${deltaStr}</div>
      <div>
        <p style="margin: 0 0 4px; color: #666; font-size: 12px;">СТАЛО</p>
        <div style="font-size: 48px; font-weight: 700; color: #0f172a; line-height: 1;">${overallScore} ${scoreEmoji}</div>
      </div>
    </div>
    <p style="margin: 16px 0 0; color: #666; font-size: 14px;">для компании <strong>${companyName}</strong></p>
  </div>

  <p>${delta > 0 ? "Отличные новости! Ваша AI-видимость выросла." : delta < 0 ? "AI-видимость снизилась — в отчёте найдёте причины и план действий." : "Видимость осталась на прежнем уровне. В отчёте — рекомендации по росту."}</p>
  <p>В отчёте вы найдёте полный сравнительный анализ: что улучшилось, что осталось, какие конкуренты изменили позиции.</p>

  <div style="text-align: center; margin: 32px 0;">
    <a href="${reportUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
      Открыть отчёт с динамикой →
    </a>
  </div>

  ${pdfUrl ? `<p style="text-align: center; margin: 8px 0;">
    <a href="${pdfUrl}" style="color: #666; font-size: 14px;">Скачать PDF-версию</a>
  </p>` : ""}

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #666; font-size: 12px; text-align: center;">
    KaliGEO · AI Search Visibility Audit<br>
    Если у вас есть вопросы, ответьте на это письмо
  </p>
</body>
</html>`,
  })
}

export async function sendReportEmail(opts: DeliveryOptions): Promise<void> {
  const { to, companyName, overallScore, reportUrl, pdfUrl, hasActionPlan, quickWins } = opts

  const scoreEmoji = overallScore >= 60 ? "🟢" : overallScore >= 30 ? "🟡" : "🔴"
  const subject = hasActionPlan
    ? `Ваш аудит и план по улучшению видимости готов — ${companyName} | Score: ${overallScore}/100`
    : `Ваш AI-аудит готов — ${companyName} | Score: ${overallScore}/100`

  const quickWinsBlock = hasActionPlan && quickWins && quickWins.length > 0
    ? `<p style="margin: 24px 0 8px; font-weight: 600; color: #0f172a;">Три первых шага на этой неделе:</p>
       <ol style="line-height: 1.9; color: #444; padding-left: 20px;">
         ${quickWins.slice(0, 3).map((w) => `<li>${w}</li>`).join("")}
       </ol>`
    : ""

  await getResend().emails.send({
    from: process.env.FROM_EMAIL ?? "noreply@kaligeo.com",
    to,
    subject,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="text-align: center; padding: 32px 0;">
    <h1 style="font-size: 28px; font-weight: 700; margin: 0;">KaliGEO</h1>
    <p style="color: #666; margin: 8px 0 0;">AI Search Visibility Audit</p>
  </div>

  <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin: 24px 0; text-align: center;">
    <p style="margin: 0 0 8px; color: #666; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Общий AI Score</p>
    <div style="font-size: 72px; font-weight: 700; color: #0f172a; line-height: 1;">${overallScore}</div>
    <div style="font-size: 24px; color: #666;">/100 ${scoreEmoji}</div>
    <p style="margin: 16px 0 0; color: #666; font-size: 14px;">для компании <strong>${companyName}</strong></p>
  </div>

  <p>Ваш ${hasActionPlan ? "аудит и план по улучшению AI-видимости" : "аудит AI-видимости"} готов. В отчёте вы найдёте:</p>
  <ul style="line-height: 1.8; color: #444;">
    <li>Детальные scores по каждой AI-платформе</li>
    <li>Матрицу конкурентов — кого AI рекомендует вместо вас</li>
    <li>Список слабых мест с конкретными рекомендациями</li>
    ${hasActionPlan ? "<li>30/60/90-дневный план роста с конкретными шагами для команды</li>" : ""}
  </ul>

  ${quickWinsBlock}

  <div style="text-align: center; margin: 32px 0;">
    <a href="${reportUrl}" style="display: inline-block; background: #0f172a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
      Открыть интерактивный отчёт →
    </a>
  </div>

  ${pdfUrl ? `<p style="text-align: center; margin: 8px 0;">
    <a href="${pdfUrl}" style="color: #666; font-size: 14px;">Скачать PDF-версию</a>
  </p>` : ""}

  <p style="text-align: center; margin: 16px 0 0;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"}/my/dashboard" style="color: #999; font-size: 13px;">
      Все ваши аудиты → Личный кабинет
    </a>
  </p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

  <p style="color: #666; font-size: 12px; text-align: center;">
    KaliGEO · AI Search Visibility Audit<br>
    Если у вас есть вопросы, ответьте на это письмо
  </p>
</body>
</html>`,
  })
}
