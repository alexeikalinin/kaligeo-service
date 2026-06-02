import { task, wait } from "@trigger.dev/sdk/v3"
import { Resend } from "resend"
import { prisma } from "../lib/prisma"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}

const FROM = () => process.env.FROM_EMAIL ?? "KaliGEO <hello@kaligeo.ru>"
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://kaligeo.ru"
const PDF_URL = () => process.env.RESEARCH_PDF_URL ?? ""

export interface ResearchNurturePayload {
  leadId: string
  email: string
  companyName: string
}

export const researchNurtureSequence = task({
  id: "send-research-nurture-sequence",
  maxDuration: 900_000, // ~10 дней
  retry: { maxAttempts: 1 },

  run: async ({ leadId, email, companyName }: ResearchNurturePayload) => {
    const scanUrl = `${APP_URL()}?utm_source=research-nurture&utm_medium=email`
    const auditUrl = `${APP_URL()}/pricing?utm_source=research-nurture&utm_medium=email`

    // Письмо 1 — немедленно: PDF + мягкий CTA
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: "Состояние GEO в России 2026 — ваш PDF",
      html: letter1({ companyName, pdfUrl: PDF_URL(), scanUrl }),
    })

    // Письмо 2 — +2 дня: данные по отрасли из исследования
    await wait.for({ days: 2 })
    const lead2 = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead2 || lead2.status === "UNSUBSCRIBED") return
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: "78% компаний невидимы в AI-поиске. Что делают оставшиеся 22%",
      html: letter2({ companyName, scanUrl }),
    })

    // Письмо 3 — +4 дня: прямой push на freemium
    await wait.for({ days: 4 })
    const lead3 = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead3 || lead3.status === "UNSUBSCRIBED") return
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `2 минуты — и вы знаете свой AI Score`,
      html: letter3({ companyName, scanUrl }),
    })

    // Письмо 4 — +7 дней: конкурентный угол + urgency
    await wait.for({ days: 7 })
    const lead4 = await prisma.lead.findUnique({ where: { id: leadId } })
    if (!lead4 || lead4.status === "UNSUBSCRIBED") return
    await getResend().emails.send({
      from: FROM(),
      to: email,
      subject: `Пока ${companyName} читает — конкуренты действуют`,
      html: letter4({ companyName, auditUrl }),
    })
  },
})

// ── Обёртка ──────────────────────────────────────────────────────────────────

function emailWrapper(content: string) {
  return `<!DOCTYPE html><html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:580px;margin:40px auto;background:#fafaf7;border:1px solid #e8e8e3;border-radius:12px;overflow:hidden;">
  <div style="background:#0f1115;padding:20px 32px;">
    <span style="font-family:'Courier New',monospace;font-weight:700;font-size:14px;color:#fafaf7;letter-spacing:0.08em;text-transform:uppercase;">KaliGEO</span>
  </div>
  <div style="padding:32px;">
    ${content}
  </div>
  <div style="padding:16px 32px;border-top:1px solid #e8e8e3;">
    <p style="font-size:11px;color:#9ca3af;margin:0;line-height:1.6;">
      KaliGEO · AI Search Visibility · kaligeo.ru<br>
      Вы получили это письмо потому что скачали исследование на сайте.<br>
      Чтобы отписаться — ответьте с темой «Отписаться».
    </p>
  </div>
</div>
</body></html>`
}

// ── Письмо 1: PDF + мягкий CTA ───────────────────────────────────────────────

function letter1({ companyName, pdfUrl, scanUrl }: {
  companyName: string
  pdfUrl: string
  scanUrl: string
}) {
  const name = companyName || "Коллега"
  const downloadBtn = pdfUrl
    ? `<a href="${pdfUrl}" style="display:inline-block;background:#a3e635;color:#0f1115;border-radius:8px;padding:13px 28px;font-size:15px;font-weight:700;text-decoration:none;">Скачать PDF →</a>`
    : `<p style="color:#6b7280;font-size:14px;">PDF готовится — пришлём ссылку в течение дня.</p>`

  return emailWrapper(`
    <p style="font-family:Georgia,serif;font-size:22px;font-weight:400;color:#0f1115;margin:0 0 16px;">
      Состояние GEO в России 2026
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
      ${name}, ваше исследование готово.
    </p>
    <div style="background:#f9fafb;border-radius:10px;padding:20px;margin:0 0 24px;">
      <p style="font-size:13px;font-weight:600;color:#111827;margin:0 0 12px;">Что внутри:</p>
      ${[
        "Средний AI Visibility Score по 12 отраслям — кто лидирует, кто в аутсайдерах",
        "Топ-5 ошибок, из-за которых ChatGPT игнорирует компанию",
        "Почему позиции в Google ≠ упоминания в AI — и что с этим делать",
        "Практический чеклист: 10 шагов для роста AI-видимости",
        "Сравнение YandexGPT vs ChatGPT: разные алгоритмы, разные победители",
      ].map(item => `<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #e5e7eb;">
        <span style="color:#a3e635;font-weight:700;flex-shrink:0;">→</span>
        <span style="font-size:13px;color:#374151;">${item}</span>
      </div>`).join("")}
    </div>
    <div style="text-align:center;margin:0 0 24px;">
      ${downloadBtn}
    </div>
    <hr style="border:none;border-top:1px solid #e8e8e3;margin:0 0 20px;">
    <p style="font-size:14px;color:#6b7280;line-height:1.7;margin:0 0 12px;">
      Пока читаете исследование — узнайте, как <strong style="color:#374151;">${name}</strong>
      выглядит в ChatGPT прямо сейчас. Бесплатный скан занимает 2 минуты.
    </p>
    <a href="${scanUrl}" style="font-size:14px;color:#0f1115;text-decoration:underline;text-underline-offset:3px;">
      Проверить свою компанию бесплатно →
    </a>
  `)
}

// ── Письмо 2: данные по отраслям ─────────────────────────────────────────────

function letter2({ companyName, scanUrl }: { companyName: string; scanUrl: string }) {
  const name = companyName || "Коллега"
  return emailWrapper(`
    <p style="font-family:'Courier New',monospace;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">День 2 · Данные из исследования</p>
    <p style="font-family:Georgia,serif;font-size:21px;font-weight:400;color:#0f1115;margin:0 0 16px;line-height:1.3;">
      78% компаний невидимы в AI. Что делают оставшиеся 22%?
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
      Из 500+ компаний в нашем исследовании только каждая пятая регулярно
      появляется в ответах ChatGPT, Gemini и Perplexity. Остальные — нет.
    </p>
    <p style="font-size:14px;color:#374151;font-weight:600;margin:0 0 12px;">Три вещи, которые делают лидеры по-другому:</p>
    ${[
      ["Schema.org разметка", "AI «читает» сайт через структурированные данные. FAQ, Organisation, LocalBusiness — без этого AI не понимает, чем занимается бизнес."],
      ["Присутствие на авторитетных площадках", "Яндекс.Бизнес, Google Maps, отраслевые справочники, деловые СМИ — именно оттуда AI собирает данные для ответов."],
      ["Контент в формате «вопрос-ответ»", "ChatGPT цитирует страницы, которые отвечают на конкретные вопросы покупателей. FAQ до 60 слов — идеальный формат."],
    ].map(([title, desc]) => `
      <div style="background:#fef9f0;border-left:3px solid #f59e0b;padding:14px 16px;margin:0 0 12px;border-radius:0 8px 8px 0;">
        <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111827;">${title}</p>
        <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.55;">${desc}</p>
      </div>`).join("")}
    <p style="font-size:14px;color:#374151;line-height:1.7;margin:20px 0 0;">
      Хотите узнать, какие из этих элементов есть у <strong>${name}</strong>
      — и какие отсутствуют? Бесплатный скан покажет ваш AI Score
      и первого конкурента, который вас опережает.
    </p>
    <div style="margin:24px 0 0;text-align:center;">
      <a href="${scanUrl}" style="display:inline-block;background:#0f1115;color:white;border-radius:8px;padding:13px 28px;font-size:15px;font-weight:600;text-decoration:none;">
        Проверить ${name} бесплатно →
      </a>
    </div>
  `)
}

// ── Письмо 3: прямой push на freemium ────────────────────────────────────────

function letter3({ companyName, scanUrl }: { companyName: string; scanUrl: string }) {
  const name = companyName || "вашу компанию"
  return emailWrapper(`
    <p style="font-family:'Courier New',monospace;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">День 4 · Пора проверить</p>
    <p style="font-family:Georgia,serif;font-size:21px;font-weight:400;color:#0f1115;margin:0 0 16px;line-height:1.3;">
      2 минуты — и вы знаете, где стоит ${name} в AI-поиске
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
      Вы уже знаете из исследования, как выглядит рынок в целом.
      Следующий шаг — узнать конкретно про <strong>${name}</strong>.
    </p>
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 24px;">
      <p style="font-size:13px;font-weight:600;color:#111827;margin:0 0 14px;">Что покажет бесплатный скан:</p>
      ${[
        "Ваш AI Visibility Score (0–100) — реальные данные, не оценка",
        "Как часто ChatGPT упоминает вас в ответах на запросы клиентов",
        "Кто из конкурентов опережает вас в AI — первый результат бесплатно",
        "Ключевые слабые места — что именно мешает AI вас находить",
      ].map(item => `<div style="display:flex;gap:10px;align-items:flex-start;padding:5px 0;">
        <span style="color:#22c55e;font-weight:700;flex-shrink:0;margin-top:1px;">✓</span>
        <span style="font-size:13px;color:#374151;line-height:1.5;">${item}</span>
      </div>`).join("")}
    </div>
    <p style="font-size:13px;color:#6b7280;margin:0 0 20px;">
      Скан занимает 2–3 минуты. Регистрация не нужна — только URL сайта.
    </p>
    <div style="text-align:center;">
      <a href="${scanUrl}" style="display:inline-block;background:#0f1115;color:white;border-radius:8px;padding:14px 32px;font-size:16px;font-weight:700;text-decoration:none;">
        Запустить бесплатный скан →
      </a>
    </div>
  `)
}

// ── Письмо 4: конкурентный угол + urgency ────────────────────────────────────

function letter4({ companyName, auditUrl }: { companyName: string; auditUrl: string }) {
  const name = companyName || "вашей компании"
  return emailWrapper(`
    <p style="font-family:'Courier New',monospace;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;margin:0 0 12px;">День 7 · Последнее письмо серии</p>
    <p style="font-family:Georgia,serif;font-size:21px;font-weight:400;color:#0f1115;margin:0 0 16px;line-height:1.3;">
      Пока ${name} читает — конкуренты действуют
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 20px;">
      Ключевой вывод из нашего исследования: компании, которые первыми
      оптимизировались под AI-поиск, закрепились в ответах ChatGPT и Perplexity.
      Каждое обновление алгоритмов усиливает текущих лидеров.
    </p>
    <div style="display:flex;gap:12px;margin:0 0 24px;">
      <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px;">Среднестатистическая компания</div>
        <div style="font-size:32px;font-weight:700;color:#ef4444;line-height:1;">12%</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px;">упоминаний в AI</div>
      </div>
      <div style="flex:1;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:16px;text-align:center;">
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px;">Лидер в нише</div>
        <div style="font-size:32px;font-weight:700;color:#22c55e;line-height:1;">71%</div>
        <div style="font-size:12px;color:#9ca3af;margin-top:4px;">упоминаний в AI</div>
      </div>
    </div>
    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 12px;">
      Разрыв в 59 процентных пунктов — это не случайность. Это результат
      конкретных действий: Schema.org, авторитетные источники, правильный формат контента.
    </p>
    <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 24px;">
      Полный аудит KaliGEO покажет точную картину по ${name}:
      кто конкретно опережает вас на каждой из 9 платформ и что сделать
      за 30, 60 и 90 дней чтобы это изменить.
    </p>
    <div style="text-align:center;margin:0 0 16px;">
      <a href="${auditUrl}" style="display:inline-block;background:#0f1115;color:white;border-radius:8px;padding:14px 32px;font-size:16px;font-weight:700;text-decoration:none;">
        Запустить полный аудит →
      </a>
    </div>
    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
      Это последнее письмо в этой серии. Если понадобится — kaligeo.ru всегда доступен.
    </p>
  `)
}
