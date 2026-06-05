import { task, wait } from "@trigger.dev/sdk/v3"
import { Resend } from "resend"
import { prisma } from "../lib/prisma"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}

const FROM = () => process.env.FROM_EMAIL ?? "noreply@kaligeo.com"
const APP_URL = () => "https://app.kaligeo.ru"
const LANDING_URL = "https://kaligeo.ru"

function auditLink(emailNum: number) {
  return `${LANDING_URL}/#pricing?utm_source=email&utm_medium=email&utm_campaign=freemium&utm_content=email${emailNum}`
}

function unsubLink(appUrl: string, scanId: string) {
  return `${appUrl}/api/freemium/unsubscribe?scanId=${scanId}`
}

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
    const appUrl = APP_URL()
    const previewUrl = `${appUrl}/preview/${scanId}?utm_source=email&utm_medium=email&utm_campaign=freemium&utm_content=email1`
    const unsub = unsubLink(appUrl, scanId)
    const scoreEmoji = previewScore >= 60 ? "🟢" : previewScore >= 30 ? "🟡" : "🔴"

    type PS = { score: number; mentionCount: number; totalQueries: number }
    const platformScores = (scan.platformScores ?? {}) as Record<string, PS>

    // Email 1 — сразу: результат скана
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `${scoreEmoji} KaliGEO: ${companyName} — score ${previewScore}/100 · ${previewScore < 30 ? "AI вас почти не видит" : "есть потенциал роста"}`,
      html: emailTemplate1({ companyName, previewScore, previewUrl, auditUrl: auditLink(1), unsub, platformScores }),
    })

    // Email 2 — +24ч: образовательный
    await wait.for({ hours: 24 })
    if (!(await prisma.freemiumScan.findUnique({ where: { id: scanId } }))?.emailCaptured) return
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `3 причины, почему ChatGPT не знает про ${companyName}`,
      html: emailTemplate2({ companyName, niche, auditUrl: auditLink(2), unsub }),
    })

    // Email 3 — +72ч: конкуренты
    await wait.for({ hours: 72 })
    const scan3 = await prisma.freemiumScan.findUnique({ where: { id: scanId } })
    if (!scan3?.emailCaptured) return
    const competitors3 = (scan3 as { suggestedCompetitors?: string[] }).suggestedCompetitors ?? []
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: competitors3.length > 0
        ? `${competitors3[0]} уже в топе AI-ответов. Как обогнать?`
        : `Конкурент в вашей нише уже в топе AI-ответов`,
      html: emailTemplate3({ companyName, niche, previewScore, auditUrl: auditLink(3), unsub, suggestedCompetitors: competitors3 }),
    })

    // Email 4 — +48ч (6й день): urgency
    await wait.for({ hours: 48 })
    if (!(await prisma.freemiumScan.findUnique({ where: { id: scanId } }))?.emailCaptured) return
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `⏳ Последний шанс: данные по ${companyName} удалятся через 48ч`,
      html: emailTemplate4({ companyName, previewScore, auditUrl: auditLink(4), unsub }),
    })

    // Email 5 — +8 дней (14й день): re-engagement
    await wait.for({ days: 8 })
    if (!(await prisma.freemiumScan.findUnique({ where: { id: scanId } }))?.emailCaptured) return
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `${companyName}: как меняется AI-видимость в вашей нише`,
      html: emailTemplate5({ companyName, niche, auditUrl: auditLink(5), unsub }),
    })
  },
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function emailWrapper(content: string, unsub: string) {
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <div style="text-align:center;padding:24px 0 16px;">
    <span style="font-family:monospace;font-weight:700;font-size:14px;letter-spacing:0.1em;text-transform:uppercase;">KaliGEO</span>
  </div>
  ${content}
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;">
  <p style="color:#9ca3af;font-size:11px;text-align:center;">
    KaliGEO · AI Search Visibility<br>
    <a href="${unsub}" style="color:#9ca3af;text-decoration:underline;">Отписаться от рассылки</a>
  </p>
</body></html>`
}

// ── Email templates ───────────────────────────────────────────────────────────

function emailTemplate1({
  companyName, previewScore, previewUrl, auditUrl, unsub, platformScores,
}: {
  companyName: string
  previewScore: number
  previewUrl: string
  auditUrl: string
  unsub: string
  platformScores: Record<string, { score: number; mentionCount: number; totalQueries: number }>
}) {
  const color = previewScore >= 60 ? "#22c55e" : previewScore >= 30 ? "#f59e0b" : "#ef4444"
  const verdict =
    previewScore < 20  ? "Критически низкая — AI игнорирует ваш бренд"
    : previewScore < 30 ? "Низкая — конкуренты значительно опережают вас"
    : previewScore < 60 ? "Средняя — есть серьёзный потенциал для роста"
    : "Хорошая — но конкуренты могут опережать"

  const platformRows = Object.entries(platformScores).map(([name, s]) => {
    const pct = s.totalQueries > 0 ? Math.round((s.mentionCount / s.totalQueries) * 100) : 0
    const barColor = pct >= 50 ? "#22c55e" : pct >= 20 ? "#f59e0b" : "#ef4444"
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;font-weight:600;color:${barColor}">${s.score}/100</td>
      <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:12px;color:#9ca3af">${pct}% запросов</td>
    </tr>`
  }).join("")

  const platformTable = Object.keys(platformScores).length > 0
    ? `<table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr>
          <th style="text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;padding:0 0 8px">Платформа</th>
          <th style="text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;padding:0 0 8px">Score</th>
          <th style="text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;padding:0 0 8px">Упоминания</th>
        </tr>
        ${platformRows}
      </table>`
    : ""

  return emailWrapper(`
  <div style="background:#f9fafb;border-radius:12px;padding:24px;margin:0 0 20px;text-align:center;">
    <p style="margin:0 0 6px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-family:monospace">Индекс AI-видимости</p>
    <div style="font-size:64px;font-weight:700;color:${color};line-height:1;">${previewScore}</div>
    <div style="font-size:18px;color:#9ca3af;">/100</div>
    <p style="margin:10px 0 0;font-size:14px;color:#374151;font-weight:500;">${verdict}</p>
  </div>

  <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px">
    Мы проверили <strong>${companyName}</strong> в AI-поисковиках.
    Когда клиенты спрашивают ChatGPT, Gemini или Perplexity о вашей нише — вот что нашли:
  </p>

  ${platformTable}

  <div style="text-align:center;margin:24px 0;">
    <a href="${auditUrl}" style="display:inline-block;background:#0f172a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
      Получить полный отчёт →
    </a>
    <p style="margin:12px 0 0;font-size:12px;color:#9ca3af">
      <a href="${previewUrl}" style="color:#9ca3af;text-decoration:underline;">Посмотреть предварительные результаты</a>
    </p>
  </div>

  <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0 0 16px">
    Завтра пришлём: 3 причины почему AI вас не упоминает — и что с этим делать
  </p>

  <div style="text-align:center;">
    <a href="${auditUrl}" style="font-size:13px;color:#6b7280;text-decoration:underline;">
      Сразу к тарифам →
    </a>
  </div>`, unsub)
}

function emailTemplate2({
  companyName, niche, auditUrl, unsub,
}: {
  companyName: string
  niche: string
  auditUrl: string
  unsub: string
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
  </div>`, unsub)
}

function emailTemplate3({
  companyName, niche, previewScore, auditUrl, unsub, suggestedCompetitors,
}: {
  companyName: string
  niche: string
  previewScore: number
  auditUrl: string
  unsub: string
  suggestedCompetitors: string[]
}) {
  const competitorList = suggestedCompetitors.slice(0, 3)
  const compSection = competitorList.length > 0
    ? `<div style="background:#fef2f2;border-radius:10px;padding:16px;margin:16px 0">
        <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#dc2626">Вероятные конкуренты в AI-ответах:</p>
        ${competitorList.map((c) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid rgba(220,38,38,.1)">
          <span style="font-size:13px;color:#374151;font-weight:500">${c}</span>
          <span style="margin-left:auto;font-size:11px;color:#dc2626;font-weight:600">конкурент</span>
        </div>`).join("")}
      </div>`
    : `<div style="background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0;font-size:13px;color:#6b7280">В нише <em>"${niche.substring(0, 60)}"</em> есть компании с AI-score 65+. Полный аудит покажет кто именно.</p>
      </div>`

  return emailWrapper(`
  <h2 style="font-size:20px;font-weight:700;margin:0 0 12px;color:#111827">Пока ${companyName} молчит, конкуренты растут</h2>

  <div style="display:flex;justify-content:space-between;gap:12px;margin:16px 0">
    <div style="text-align:center;flex:1;background:#fef2f2;border:1px solid #fecaca;padding:16px;border-radius:10px">
      <div style="font-size:36px;font-weight:700;color:#ef4444;line-height:1">${previewScore}</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:4px">Ваш score</div>
    </div>
    <div style="text-align:center;flex:1;background:#f0fdf4;border:1px solid #86efac;padding:16px;border-radius:10px">
      <div style="font-size:36px;font-weight:700;color:#22c55e;line-height:1">65+</div>
      <div style="font-size:11px;color:#9ca3af;margin-top:4px">Топ ниши</div>
    </div>
  </div>

  ${compSection}

  <p style="font-size:14px;color:#374151;line-height:1.7;margin:16px 0">
    Разрыв увеличивается каждый месяц. AI-алгоритмы обновляются — и каждое обновление закрепляет текущих лидеров.
    Чем дольше ждать — тем дороже догонять.
  </p>

  <div style="text-align:center;margin:24px 0;">
    <a href="${auditUrl}" style="display:inline-block;background:#0f172a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
      Обогнать конкурентов →
    </a>
  </div>`, unsub)
}

function emailTemplate4({
  companyName, previewScore, auditUrl, unsub,
}: {
  companyName: string
  previewScore: number
  auditUrl: string
  unsub: string
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
  </p>`, unsub)
}

function emailTemplate5({
  companyName, niche, auditUrl, unsub,
}: {
  companyName: string
  niche: string
  auditUrl: string
  unsub: string
}) {
  return emailWrapper(`
  <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-family:monospace">День 14 · Обновление</p>
  <h2 style="font-size:20px;font-weight:700;margin:0 0 16px;color:#111827">${companyName}: что происходит с AI-видимостью в вашей нише</h2>

  <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px">
    Прошло две недели с момента вашей проверки. AI-алгоритмы обновляются каждые 2–4 недели,
    и конкурентная картина в нише <em>"${niche.substring(0, 60)}"</em> меняется.
  </p>

  <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 20px">
    <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#111827">Что влияет на AI-видимость прямо сейчас</p>
    ${[
      ["Wikipedia и Wikidata", "ChatGPT берёт 40–48% данных оттуда. Один раз создали — работает годами."],
      ["Schema.org разметка", "30 минут работы. AI начинает правильно идентифицировать ваш бизнес."],
      ["FAQ-страница с ответами ≤60 слов", "Именно такой формат AI цитирует дословно в своих ответах."],
    ].map(([t, d]) => `<div style="padding:8px 0;border-bottom:1px solid #e5e7eb">
      <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#111827">→ ${t}</p>
      <p style="margin:0;font-size:12px;color:#6b7280">${d}</p>
    </div>`).join("")}
  </div>

  <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 20px">
    Если хотите увидеть полную картину: кто из конкурентов обгоняет вас, на каких платформах,
    и получить конкретный план — полный аудит даст ответы на все эти вопросы.
  </p>

  <div style="text-align:center;margin:0">
    <a href="${auditUrl}" style="display:inline-block;background:#0f172a;color:white;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
      Запустить полный аудит →
    </a>
  </div>

  <p style="font-size:12px;color:#9ca3af;text-align:center;margin:16px 0 0">
    Это последнее письмо в этой серии. Если передумаете — всегда рады видеть вас на kaligeo.ru
  </p>`, unsub)
}
