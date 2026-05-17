import { task, wait } from "@trigger.dev/sdk/v3"
import { Resend } from "resend"
import { prisma } from "../lib/prisma"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}

const FROM = () => process.env.FROM_EMAIL ?? "noreply@kaligeo.com"
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://kaligeo.ru"

export interface FreemiumSequencePayload {
  scanId: string
  email: string
}

export const freemiumSequence = task({
  id: "send-freemium-sequence",
  maxDuration: 700_000,
  retry: { maxAttempts: 1 },

  run: async ({ scanId, email }: FreemiumSequencePayload) => {
    const scan = await prisma.freemiumScan.findUnique({ where: { id: scanId } })
    if (!scan) return

    const { companyName, previewScore, niche } = scan
    const previewUrl = `${APP_URL()}/preview/${scanId}`
    const auditUrl = `${APP_URL()}/chat?url=${encodeURIComponent(scan.websiteUrl)}`
    const scoreEmoji = previewScore >= 30 ? "🟡" : "🔴"

    // Email 1 — immediate: score result
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `${scoreEmoji} Ваш AI Score: ${previewScore}/100 | ${companyName}`,
      html: emailTemplate1({ companyName, previewScore, previewUrl, auditUrl }),
    })

    // Email 2 — +24h: educational
    await wait.for({ hours: 24 })
    const scan2 = await prisma.freemiumScan.findUnique({ where: { id: scanId } })
    if (!scan2?.emailCaptured) return // unsubscribed or deleted
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `3 причины, почему ChatGPT не знает про ${companyName}`,
      html: emailTemplate2({ companyName, niche, auditUrl }),
    })

    // Email 3 — +72h: competitor angle
    await wait.for({ hours: 72 })
    const scan3 = await prisma.freemiumScan.findUnique({ where: { id: scanId } })
    if (!scan3?.emailCaptured) return
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `Конкурент в вашей нише уже в топе AI-ответов`,
      html: emailTemplate3({ companyName, niche, previewScore, auditUrl }),
    })

    // Email 4 — +48h: urgency
    await wait.for({ hours: 48 })
    const scan4 = await prisma.freemiumScan.findUnique({ where: { id: scanId } })
    if (!scan4?.emailCaptured) return
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `⏳ Последний шанс: данные по ${companyName} удалятся через 48ч`,
      html: emailTemplate4({ companyName, previewScore, auditUrl }),
    })
  },
})

// ── Email templates ──────────────────────────────────────────────────────────

function emailWrapper(content: string) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="font-family:monospace;font-weight:700;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;">KaliGEO</span>
  </div>
  ${content}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
  <p style="color:#9ca3af;font-size:11px;text-align:center;">
    KaliGEO · AI Search Visibility<br>
    Чтобы отписаться — ответьте на это письмо с темой "Отписаться"
  </p>
</body></html>`
}

function emailTemplate1({
  companyName,
  previewScore,
  previewUrl,
  auditUrl,
}: {
  companyName: string
  previewScore: number
  previewUrl: string
  auditUrl: string
}) {
  const color = previewScore >= 30 ? "#f59e0b" : "#ef4444"
  const verdict =
    previewScore < 20
      ? "Критически низкая — AI игнорирует ваш бренд"
      : previewScore < 30
      ? "Низкая — конкуренты значительно опережают вас"
      : "Средняя — есть серьёзный потенциал для роста"

  return emailWrapper(`
  <div style="background:#f9fafb;border-radius:12px;padding:32px;margin:16px 0;text-align:center;">
    <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;">Индекс AI-видимости</p>
    <div style="font-size:64px;font-weight:700;color:${color};line-height:1;">${previewScore}</div>
    <div style="font-size:20px;color:#6b7280;">/100</div>
    <p style="margin:12px 0 0;font-size:14px;color:#374151;">${verdict}</p>
  </div>

  <p>Мы проверили <strong>${companyName}</strong> в AI-поисковиках.</p>
  <p>Когда потенциальные клиенты спрашивают ChatGPT, Gemini или Perplexity о вашей нише — ваш бренд появляется в ответах значительно реже, чем мог бы.</p>

  <div style="text-align:center;margin:28px 0;">
    <a href="${previewUrl}" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
      Посмотреть результаты →
    </a>
  </div>

  <p style="font-size:14px;color:#6b7280;">Полный аудит покажет: какие AI-платформы вас игнорируют, кого рекомендуют вместо вас и конкретный план исправления.</p>

  <div style="text-align:center;margin:20px 0;">
    <a href="${auditUrl}" style="font-size:14px;color:#6b7280;">Запустить полный аудит →</a>
  </div>`)
}

function emailTemplate2({
  companyName,
  niche,
  auditUrl,
}: {
  companyName: string
  niche: string
  auditUrl: string
}) {
  return emailWrapper(`
  <h2 style="font-size:20px;font-weight:700;margin:0 0 16px;">3 причины, почему ChatGPT не знает про ${companyName}</h2>

  <p style="color:#374151;line-height:1.6;">AI-поисковики (ChatGPT, Perplexity, Gemini) берут информацию из конкретных источников. Если вас там нет — вы невидимы.</p>

  <div style="background:#fef9f0;border-left:3px solid #f59e0b;padding:12px 16px;margin:20px 0;">
    <p style="margin:0;font-weight:600;font-size:14px;">1. Нет структурированных данных (Schema.org)</p>
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">AI не понимает, чем занимается ваш бизнес. FAQ, Organisation, LocalBusiness — всё это помогает AI "прочитать" ваш сайт.</p>
  </div>

  <div style="background:#fef9f0;border-left:3px solid #f59e0b;padding:12px 16px;margin:20px 0;">
    <p style="margin:0;font-weight:600;font-size:14px;">2. Нет упоминаний на авторитетных ресурсах</p>
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Отраслевые справочники, Яндекс.Бизнес, Google Maps, Forbes — оттуда AI собирает данные. Без них — вас нет.</p>
  </div>

  <div style="background:#fef9f0;border-left:3px solid #f59e0b;padding:12px 16px;margin:20px 0;">
    <p style="margin:0;font-weight:600;font-size:14px;">3. Контент не отвечает на вопросы покупателей</p>
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">AI цитирует сайты, которые отвечают на конкретные вопросы. "Лучший ${niche.substring(0, 40)}" — ваш сайт должен быть ответом на такие запросы.</p>
  </div>

  <p style="font-size:14px;color:#374151;">Полный аудит покажет, каких именно элементов не хватает <strong>${companyName}</strong> и как их добавить.</p>

  <div style="text-align:center;margin:24px 0;">
    <a href="${auditUrl}" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
      Получить полный аудит →
    </a>
  </div>`)
}

function emailTemplate3({
  companyName,
  niche,
  previewScore,
  auditUrl,
}: {
  companyName: string
  niche: string
  previewScore: number
  auditUrl: string
}) {
  return emailWrapper(`
  <h2 style="font-size:20px;font-weight:700;margin:0 0 16px;">Пока ${companyName} молчит, конкуренты растут</h2>

  <p style="color:#374151;line-height:1.6;">
    В нише <em>"${niche.substring(0, 80)}"</em> уже есть компании, которые целенаправленно работают над AI-видимостью.
  </p>

  <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:20px 0;">
    <p style="margin:0;font-size:13px;color:#6b7280;">Типичная картина в вашей нише:</p>
    <div style="display:flex;justify-content:space-between;margin-top:12px;gap:12px;">
      <div style="text-align:center;flex:1;background:white;padding:12px;border-radius:6px;">
        <div style="font-size:24px;font-weight:700;color:#ef4444;">${previewScore}</div>
        <div style="font-size:11px;color:#9ca3af;">Ваш текущий score</div>
      </div>
      <div style="text-align:center;flex:1;background:white;padding:12px;border-radius:6px;">
        <div style="font-size:24px;font-weight:700;color:#22c55e;">65+</div>
        <div style="font-size:11px;color:#9ca3af;">Топ конкурентов</div>
      </div>
    </div>
  </div>

  <p style="font-size:14px;color:#374151;">
    Разрыв увеличивается с каждым месяцем. Чем дольше ждать — тем дороже догонять.
  </p>
  <p style="font-size:14px;color:#374151;">
    Полный аудит даёт конкретный план: что делать в первые 30 дней, чтобы начать появляться в AI-ответах.
  </p>

  <div style="text-align:center;margin:24px 0;">
    <a href="${auditUrl}" style="display:inline-block;background:#0f172a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
      Запустить аудит — от $50 →
    </a>
  </div>`)
}

function emailTemplate4({
  companyName,
  previewScore,
  auditUrl,
}: {
  companyName: string
  previewScore: number
  auditUrl: string
}) {
  return emailWrapper(`
  <h2 style="font-size:20px;font-weight:700;margin:0 0 4px;">Последнее письмо про ${companyName}</h2>
  <p style="color:#9ca3af;font-size:13px;margin:0 0 20px;">Ваши данные скоро удалятся</p>

  <div style="background:#fef2f2;border-radius:8px;padding:20px;margin:16px 0;text-align:center;">
    <p style="margin:0;font-size:14px;color:#dc2626;font-weight:600;">⏳ Данные скана удалятся через 48 часов</p>
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">AI Score ${previewScore}/100 и список проблем будут недоступны</p>
  </div>

  <p style="font-size:14px;color:#374151;line-height:1.6;">
    Если хотите получить полный отчёт с анализом конкурентов, конкретными рекомендациями и 30/60/90-дневным планом — это последний шанс.
  </p>

  <div style="text-align:center;margin:24px 0;">
    <a href="${auditUrl}" style="display:inline-block;background:#dc2626;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
      Запустить аудит сейчас →
    </a>
  </div>

  <p style="font-size:12px;color:#9ca3af;text-align:center;">
    Если вас не интересует AI-видимость прямо сейчас — просто проигнорируйте это письмо.
    Мы не будем присылать больше сообщений по этой теме.
  </p>`)
}
