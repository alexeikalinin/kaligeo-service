import { task, wait } from "@trigger.dev/sdk/v3"
import { Resend } from "resend"
import { prisma } from "../lib/prisma"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}
const FROM = () => process.env.FROM_EMAIL ?? "hello@kaligeo.ru"
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"

export interface PostAuditSequencePayload {
  jobId: string
  tier: string
  isTrial: boolean
}

// Shared report data shape
interface ReportData {
  overallScore: number
  weakPoints: { id: string; title: string; description: string; severity: string }[]
  competitorMatrix: { name: string; platforms: string[]; mentionCount: number }[]
  actionPlan: {
    strategy?: string
    quickWins?: { action: string; howTo: string; timeEstimate: string; impact: string }[]
    geoTacticsThisWeek?: { tactic: string; why: string; expectedEffect: string }[]
    "30d"?: { title: string; description: string; effort: string; impact: string }[]
  }
}

export const postAuditSequence = task({
  id: "post-audit-sequence",
  maxDuration: 5_000_000, // ~57 дней
  retry: { maxAttempts: 1 },

  run: async ({ jobId, tier, isTrial }: PostAuditSequencePayload) => {
    const job = await prisma.auditJob.findUnique({ where: { id: jobId } })
    if (!job) return

    const reportUrl = `${APP_URL()}/report/${jobId}?token=${job.reportToken}`
    const upgradeUrl = `${APP_URL()}/pricing`
    const reauditUrl = `${APP_URL()}/chat?url=${encodeURIComponent(job.websiteUrl)}`

    const getReport = async (): Promise<ReportData | null> => {
      const r = await prisma.report.findUnique({ where: { jobId } })
      if (!r) return null
      return {
        overallScore: r.overallScore,
        weakPoints: (r.weakPoints as ReportData["weakPoints"]) ?? [],
        competitorMatrix: (r.competitorMatrix as ReportData["competitorMatrix"]) ?? [],
        actionPlan: (r.actionPlan as ReportData["actionPlan"]) ?? {},
      }
    }

    if (isTrial) {
      await runTrialSequence({ job, reportUrl, upgradeUrl, getReport })
    } else if (tier === "BASIC") {
      await runBasicSequence({ job, reportUrl, upgradeUrl, reauditUrl, getReport })
    } else if (tier === "STANDARD" || tier === "ADVANCED") {
      await runStandardSequence({ job, reportUrl, reauditUrl, getReport })
    }
    // MONITOR_* — отдельный monitoring-alerts.ts, здесь skip
  },
})

// ── Trial sequence ────────────────────────────────────────────────────────────

async function runTrialSequence({
  job, reportUrl, upgradeUrl, getReport,
}: {
  job: { id: string; clientEmail: string; companyName: string; niche: string }
  reportUrl: string
  upgradeUrl: string
  getReport: () => Promise<ReportData | null>
}) {
  // T-2: +2 дня — разбор 3 главных находок
  await wait.for({ days: 2 })
  const report = await getReport()
  if (!report) return

  const topWeakPoints = report.weakPoints
    .filter((w) => w.severity === "high" || w.severity === "medium")
    .slice(0, 3)

  await getResend().emails.send({
    from: FROM(),
    to: job.clientEmail,
    subject: `${job.companyName}: 3 вещи, которые мешают вам появляться в ChatGPT`,
    html: templateTrialFindings({ job, report, topWeakPoints, upgradeUrl }),
  })

  // T-3: +5 дней — конкуренты которых AI называет вместо вас
  await wait.for({ days: 3 })
  const report3 = await getReport()
  if (!report3) return

  const topCompetitors = report3.competitorMatrix.slice(0, 3)
  if (topCompetitors.length > 0) {
    await getResend().emails.send({
      from: FROM(),
      to: job.clientEmail,
      subject: `${topCompetitors[0]?.name ?? "Конкуренты"} уже в топе AI-ответов. Почему не ${job.companyName}?`,
      html: templateTrialCompetitors({ job, report: report3, topCompetitors, reportUrl, upgradeUrl }),
    })
  }

  // T-4: +10 дней — специальное предложение
  await wait.for({ days: 5 })
  await getResend().emails.send({
    from: FROM(),
    to: job.clientEmail,
    subject: `${job.companyName}: −20% на полный план роста (только 72 часа)`,
    html: templateTrialOffer({ job, report: await getReport() ?? report, upgradeUrl }),
  })
}

// ── Basic sequence ────────────────────────────────────────────────────────────

async function runBasicSequence({
  job, reportUrl, upgradeUrl, reauditUrl, getReport,
}: {
  job: { id: string; clientEmail: string; companyName: string; niche: string; websiteUrl: string }
  reportUrl: string
  upgradeUrl: string
  reauditUrl: string
  getReport: () => Promise<ReportData | null>
}) {
  // B-2: +3 дня — одно действие на этой неделе
  await wait.for({ days: 3 })
  const report = await getReport()
  if (!report) return

  const quickWin = report.actionPlan.quickWins?.[0]
  const topWeakPoint = report.weakPoints[0]

  await getResend().emails.send({
    from: FROM(),
    to: job.clientEmail,
    subject: `${job.companyName}: один шаг, который даст +10 к AI-видимости`,
    html: templateBasicOneAction({ job, quickWin, topWeakPoint, reportUrl }),
  })

  // B-3: +14 дней — подсказка под главное слабое место
  await wait.for({ days: 11 })
  const report3 = await getReport()
  if (!report3) return

  const mainWeakPoint = report3.weakPoints.find((w) => w.severity === "high") ?? report3.weakPoints[0]
  await getResend().emails.send({
    from: FROM(),
    to: job.clientEmail,
    subject: `Как за 30 минут сделать так, чтобы ChatGPT узнал ${job.companyName}`,
    html: templateBasicTip({ job, mainWeakPoint, reauditUrl, upgradeUrl }),
  })
}

// ── Standard / Advanced sequence ─────────────────────────────────────────────

async function runStandardSequence({
  job, reportUrl, reauditUrl, getReport,
}: {
  job: { id: string; clientEmail: string; companyName: string; niche: string; websiteUrl: string }
  reportUrl: string
  reauditUrl: string
  getReport: () => Promise<ReportData | null>
}) {
  // SA-2: +3 дня — чеклист на первую неделю
  await wait.for({ days: 3 })
  const report = await getReport()
  if (!report) return

  const tactics = report.actionPlan.geoTacticsThisWeek?.slice(0, 3) ?? []
  const quickWins = report.actionPlan.quickWins?.slice(0, 3) ?? []

  await getResend().emails.send({
    from: FROM(),
    to: job.clientEmail,
    subject: `${job.companyName}: ваш план на 7 дней — 3 тактики из отчёта`,
    html: templateStandardWeekPlan({ job, tactics, quickWins, reportUrl }),
  })

  // SA-3: +21 день — проверка прогресса
  await wait.for({ days: 18 })
  const report3 = await getReport()
  if (!report3) return

  const topWeakPoints = report3.weakPoints.filter((w) => w.severity === "high").slice(0, 3)
  await getResend().emails.send({
    from: FROM(),
    to: job.clientEmail,
    subject: `${job.companyName}: 3 недели прошло — как AI-видимость?`,
    html: templateStandardProgressCheck({ job, topWeakPoints, reportUrl }),
  })

  // SA-4: +45 дней — время проверить результат
  await wait.for({ days: 24 })
  const report4 = await getReport()
  if (!report4) return

  await getResend().emails.send({
    from: FROM(),
    to: job.clientEmail,
    subject: `45 дней → пора проверить: как изменилась видимость ${job.companyName}?`,
    html: templateStandardReaudit({ job, report: report4, reauditUrl }),
  })
}

// ── Email Templates ───────────────────────────────────────────────────────────

function base(content: string) {
  return `<!DOCTYPE html><html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0;color:#111827">
<div style="max-width:580px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:28px">
    <span style="font-family:monospace;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#111827">KaliGEO</span>
  </div>
  <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">
    ${content}
  </div>
  <div style="text-align:center;margin-top:20px">
    <p style="font-size:11px;color:#9ca3af;margin:0">KaliGEO · AI Search Visibility · <a href="mailto:hello@kaligeo.ru?subject=Отписаться" style="color:#9ca3af">Отписаться</a></p>
  </div>
</div>
</body></html>`
}

function eyebrow(text: string) {
  return `<p style="margin:0 0 6px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-family:monospace">${text}</p>`
}

function heading(text: string) {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;line-height:1.25;color:#111827">${text}</h1>`
}

function cta(text: string, url: string, color = "#111827") {
  return `<div style="text-align:center;margin:24px 0"><a href="${url}" style="display:inline-block;background:${color};color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">${text}</a></div>`
}

function weakPointCard(wp: { title: string; description: string; severity: string }, index: number) {
  const colors: Record<string, { bg: string; border: string; label: string }> = {
    high:   { bg: "#fef2f2", border: "#fecaca", label: "Критично" },
    medium: { bg: "#fffbeb", border: "#fde68a", label: "Важно" },
    low:    { bg: "#f0fdf4", border: "#bbf7d0", label: "Рекомендовано" },
  }
  const c = colors[wp.severity] ?? colors.medium
  return `
    <div style="background:${c.bg};border:1px solid ${c.border};border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.06em">${index + 1}. ${c.label}</span>
        <span style="font-size:14px;font-weight:700;color:#111827">${wp.title}</span>
      </div>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6">${wp.description}</p>
    </div>`
}

// T-2: Trial — разбор находок
function templateTrialFindings({
  job, topWeakPoints, upgradeUrl,
}: {
  job: { companyName: string; niche: string }
  report: ReportData
  topWeakPoints: ReportData["weakPoints"]
  upgradeUrl: string
}) {
  const wpCards = topWeakPoints.map((w, i) => weakPointCard(w, i)).join("")

  return base(`
    ${eyebrow("День 2 · Разбор отчёта")}
    ${heading(`${job.companyName}: что именно мешает появляться в ChatGPT`)}

    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px">
      Ваш бесплатный аудит выявил конкретные проблемы. Вот три главных — простыми словами, без техжаргона:
    </p>

    ${wpCards || `<p style="color:#6b7280;font-size:14px">Слабые места выявляются в полном аудите — данных недостаточно для детального анализа.</p>`}

    <div style="background:#f0fdf4;border-radius:10px;padding:16px;margin:20px 0">
      <p style="margin:0;font-size:14px;font-weight:600;color:#166534">💡 Что даст полный аудит STANDARD</p>
      <ul style="margin:8px 0 0;padding-left:18px;font-size:13px;color:#374151;line-height:1.9">
        <li>15+ конкретных шагов с инструкциями (не абстракции)</li>
        <li>Анализ 6 AI-платформ вместо 3</li>
        <li>Матрица конкурентов — кто и почему лидирует</li>
        <li>Готовый план 30/60/90 дней для вашей команды</li>
      </ul>
    </div>

    ${cta("Получить полный план роста →", upgradeUrl, "#111827")}

    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:8px 0 0">
      Завтра пришлём: кого AI рекомендует вместо ${job.companyName}
    </p>
  `)
}

// T-3: Trial — конкуренты
function templateTrialCompetitors({
  job, topCompetitors, reportUrl, upgradeUrl,
}: {
  job: { companyName: string; niche: string }
  report: ReportData
  topCompetitors: ReportData["competitorMatrix"]
  reportUrl: string
  upgradeUrl: string
}) {
  const compRows = topCompetitors.map((c) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;color:#111827">${c.name}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#374151">${c.mentionCount} упоминаний</td>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;text-align:right;color:#6b7280;font-size:13px">${c.platforms.slice(0, 3).join(", ")}</td>
    </tr>`).join("")

  return base(`
    ${eyebrow("День 5 · Конкурентный анализ")}
    ${heading(`Вот кого AI рекомендует вместо ${job.companyName}`)}

    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px">
      Мы нашли эти компании в ответах AI на запросы из вашей ниши. Они появляются там, где должны быть вы:
    </p>

    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
      <thead>
        <tr>
          <th style="text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;padding:0 0 10px;font-weight:500">Конкурент</th>
          <th style="text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;padding:0 0 10px;font-weight:500">Упоминания</th>
          <th style="text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;padding:0 0 10px;font-weight:500">Платформы</th>
        </tr>
      </thead>
      <tbody>${compRows}</tbody>
    </table>

    <div style="background:#fef2f2;border-radius:10px;padding:16px;margin:0 0 20px">
      <p style="margin:0;font-size:14px;color:#dc2626;font-weight:600">Почему они лидируют, а не вы?</p>
      <p style="margin:8px 0 0;font-size:13px;color:#374151;line-height:1.6">
        Они присутствуют в источниках, которые AI использует: авторитетные каталоги, деловые СМИ,
        Wikipedia, структурированная разметка. Это можно исправить — и полный аудит покажет как именно.
      </p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:0 0 20px">
      <a href="${reportUrl}" style="display:block;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;color:#374151">
        Открыть бесплатный отчёт
      </a>
      <a href="${upgradeUrl}" style="display:block;background:#111827;border-radius:8px;padding:12px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;color:#fff">
        Обогнать конкурентов →
      </a>
    </div>
  `)
}

// T-4: Trial — спецпредложение
function templateTrialOffer({
  job, report, upgradeUrl,
}: {
  job: { companyName: string }
  report: ReportData
  upgradeUrl: string
}) {
  const score = report.overallScore

  return base(`
    ${eyebrow("День 10 · Специальное предложение")}
    ${heading(`${job.companyName}: −20% на полный план роста`)}

    <div style="background:#fef9f0;border:2px solid #f59e0b;border-radius:12px;padding:20px;margin:0 0 20px;text-align:center">
      <p style="margin:0 0 6px;font-size:13px;color:#92400e;text-transform:uppercase;letter-spacing:.06em;font-weight:600">Только 72 часа</p>
      <p style="margin:0;font-size:28px;font-weight:700;color:#111827">Скидка 20% на STANDARD</p>
      <p style="margin:6px 0 0;font-size:14px;color:#6b7280">13 900 ₽ → 11 120 ₽ · Промокод: <strong>TRIAL20</strong></p>
    </div>

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px">
      Ваш бесплатный аудит показал score <strong>${score}/100</strong>. STANDARD-аудит откроет:
    </p>

    <table style="width:100%;border-collapse:collapse;margin:0 0 20px">
      ${[
        ["3 платформы → 6 платформ", "ChatGPT, Gemini, YandexGPT + Claude, Perplexity, DeepSeek"],
        ["Матрица конкурентов", "Кто и почему обгоняет вас в AI-ответах"],
        ["30/60/90-дневный план", "Конкретные шаги для маркетолога, разработчика, контента"],
        ["Слабые места — 15+", "С инструкциями что именно исправить"],
        ["Скачать PDF отчёт", "Готово для презентации руководству"],
      ].map(([f, d]) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-weight:600;font-size:14px;color:#111827;width:45%">✓ ${f}</td>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280">${d}</td>
        </tr>`).join("")}
    </table>

    ${cta("Получить STANDARD со скидкой →", `${upgradeUrl}?promo=TRIAL20`, "#f59e0b")}

    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">
      Предложение действует 72 часа. После — стандартная цена.
    </p>
  `)
}

// B-2: Basic — одно действие
function templateBasicOneAction({
  job, quickWin, topWeakPoint, reportUrl,
}: {
  job: { companyName: string }
  quickWin?: { action: string; howTo: string; timeEstimate: string; impact: string }
  topWeakPoint?: { title: string; description: string }
  reportUrl: string
}) {
  const actionTitle = quickWin?.action ?? topWeakPoint?.title ?? "Добавить Schema.org разметку"
  const actionDetail = quickWin?.howTo ?? topWeakPoint?.description ?? "Структурированные данные помогают AI идентифицировать ваш бизнес как авторитетный источник."
  const timeEst = quickWin?.timeEstimate ?? "30–60 минут"
  const impact = quickWin?.impact ?? "ChatGPT и Claude начнут правильно идентифицировать компанию через 2–4 недели"

  return base(`
    ${eyebrow("День 3 · Первый шаг")}
    ${heading(`${job.companyName}: одно действие, которое даст +10 к AI-видимости`)}

    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px">
      Из всего плана мы выбрали самое быстрое и важное. Сделайте только это — и увидите первые результаты через 2–4 недели.
    </p>

    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin:0 0 20px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="background:#22c55e;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:999px;letter-spacing:.04em">#{1} ПРИОРИТЕТ</span>
        <span style="font-size:15px;font-weight:700;color:#111827">${actionTitle}</span>
      </div>
      <p style="margin:0 0 12px;font-size:13px;color:#374151;line-height:1.7">${actionDetail}</p>
      <div style="display:flex;gap:12px;flex-wrap:wrap">
        <span style="font-size:12px;background:#fff;border:1px solid #e5e7eb;padding:4px 10px;border-radius:6px;color:#6b7280">⏱ ${timeEst}</span>
        <span style="font-size:12px;background:#fff;border:1px solid #e5e7eb;padding:4px 10px;border-radius:6px;color:#374151">→ ${impact}</span>
      </div>
    </div>

    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 20px">
      В вашем полном отчёте — ещё 10+ таких шагов, отсортированных по приоритету и разбитых по исполнителям.
    </p>

    ${cta("Открыть полный отчёт →", reportUrl)}
  `)
}

// B-3: Basic — совет по слабому месту
function templateBasicTip({
  job, mainWeakPoint, reauditUrl, upgradeUrl,
}: {
  job: { companyName: string }
  mainWeakPoint?: { id: string; title: string; description: string }
  reauditUrl: string
  upgradeUrl: string
}) {
  const isSchema = !mainWeakPoint || mainWeakPoint.id === "missing-schema"

  const tipContent = isSchema
    ? `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px">
        <strong>Schema.org разметка</strong> — это короткий JSON-код в <code>&lt;head&gt;</code> вашего сайта. Он говорит AI: «Это компания X, она делает Y, находится в Z». Без него ChatGPT гадает кто вы.
      </p>
      <div style="background:#1e293b;border-radius:10px;padding:16px;margin:0 0 16px">
        <p style="margin:0 0 8px;font-size:11px;color:#94a3b8;font-family:monospace;text-transform:uppercase;letter-spacing:.08em">Пример кода (вставить в &lt;head&gt;)</p>
        <pre style="margin:0;font-family:monospace;font-size:12px;color:#86efac;overflow-x:auto;white-space:pre-wrap">{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "${job.companyName}",
  "url": "https://ваш-сайт.ru",
  "description": "Краткое описание бизнеса"
}</pre>
      </div>
      <p style="font-size:13px;color:#374151;line-height:1.6;margin:0 0 16px">
        Генератор кода: <a href="https://technicalseo.com/tools/schema-markup-generator/" style="color:#4f46e5">technicalseo.com/tools</a> —
        выберите <em>Organization</em>, заполните поля, скопируйте результат.
      </p>`
    : `<p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px">
        В вашем аудите выявлено: <strong>${mainWeakPoint.title}</strong>
      </p>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 16px">${mainWeakPoint.description}</p>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 16px">
        Исправление этого пункта — один из самых быстрых способов улучшить AI-видимость.
      </p>`

  return base(`
    ${eyebrow("День 14 · Практический совет")}
    ${heading(`Как за 30 минут сделать так, чтобы ChatGPT узнал ${job.companyName}`)}

    ${tipContent}

    <div style="background:#f9fafb;border-radius:10px;padding:16px;margin:0 0 20px">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#111827">Хотите проверить, сработало ли?</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6">
        Повторный аудит покажет разницу. AI-алгоритмы обновляются раз в 2–4 недели — если вы добавили разметку,
        через месяц score должен вырасти.
      </p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <a href="${reauditUrl}" style="display:block;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;color:#374151">
        Повторный аудит
      </a>
      <a href="${upgradeUrl}" style="display:block;background:#111827;border-radius:8px;padding:12px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;color:#fff">
        Полный план STANDARD →
      </a>
    </div>
  `)
}

// SA-2: Standard — план на первую неделю
function templateStandardWeekPlan({
  job, tactics, quickWins, reportUrl,
}: {
  job: { companyName: string }
  tactics: { tactic: string; why: string; expectedEffect: string }[]
  quickWins: { action: string; howTo: string; timeEstimate: string }[]
  reportUrl: string
}) {
  const items = tactics.length > 0 ? tactics : quickWins.map((w) => ({
    tactic: w.action,
    why: w.howTo,
    expectedEffect: `Эффект через 2–4 недели`,
  }))

  const itemCards = items.slice(0, 3).map((item, i) => `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="background:#111827;color:#fff;font-size:11px;font-weight:700;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:50%;flex-shrink:0;margin-top:1px">${i + 1}</span>
        <div>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#111827">${item.tactic}</p>
          <p style="margin:0 0 6px;font-size:13px;color:#374151;line-height:1.6">${item.why}</p>
          <p style="margin:0;font-size:12px;color:#6b7280">→ ${item.expectedEffect}</p>
        </div>
      </div>
    </div>`).join("")

  return base(`
    ${eyebrow("День 3 · Первая неделя")}
    ${heading(`${job.companyName}: ваш план на 7 дней`)}

    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px">
      Из всего Action Plan мы выбрали три тактики, которые дают результат быстрее всего.
      Начните с них — остальное в отчёте.
    </p>

    ${itemCards}

    <div style="background:#f9fafb;border-radius:10px;padding:14px 16px;margin:16px 0">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#111827">Полный план 30/60/90 дней</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6">
        В вашем отчёте — пошаговый план с исполнителями (маркетолог / разработчик / контент-менеджер)
        и ожидаемым результатом по каждому пункту.
      </p>
    </div>

    ${cta("Открыть полный план →", reportUrl)}
  `)
}

// SA-3: Standard — проверка прогресса
function templateStandardProgressCheck({
  job, topWeakPoints, reportUrl,
}: {
  job: { companyName: string }
  topWeakPoints: ReportData["weakPoints"]
  reportUrl: string
}) {
  const checkItems = topWeakPoints.slice(0, 3).map((w) => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 0;border-bottom:1px solid #f3f4f6">
      <div style="width:20px;height:20px;border:2px solid #e5e7eb;border-radius:4px;flex-shrink:0;margin-top:1px"></div>
      <div>
        <p style="margin:0 0 2px;font-size:14px;font-weight:600;color:#111827">${w.title}</p>
        <p style="margin:0;font-size:12px;color:#9ca3af">${w.severity === "high" ? "Критично" : "Важно"} · из вашего аудита</p>
      </div>
    </div>`).join("")

  const reauditUrl = `${APP_URL()}/pricing`

  return base(`
    ${eyebrow("День 21 · Проверка прогресса")}
    ${heading(`${job.companyName}: 3 недели — как дела с планом?`)}

    <p style="color:#374151;font-size:15px;line-height:1.7;margin:0 0 20px">
      Ваш отчёт был готов 3 недели назад. Обычно первые улучшения AI-видимости появляются именно сейчас.
    </p>

    <p style="font-size:14px;font-weight:600;color:#111827;margin:0 0 10px">Удалось ли закрыть эти пункты?</p>
    ${checkItems}

    <div style="background:#fef9f0;border-radius:10px;padding:14px 16px;margin:20px 0">
      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#92400e">Не успели — ничего страшного</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6">
        GEO — это марафон, не спринт. Открывайте отчёт, берите следующий quick win и делайте по одному шагу в неделю.
        Через 60–90 дней результат будет заметен.
      </p>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <a href="${reportUrl}" style="display:block;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;color:#374151">
        Открыть отчёт
      </a>
      <a href="${reauditUrl}" style="display:block;background:#111827;border-radius:8px;padding:12px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;color:#fff">
        Повторный аудит →
      </a>
    </div>
  `)
}

// SA-4: Standard — время проверить результат
function templateStandardReaudit({
  job, report, reauditUrl,
}: {
  job: { companyName: string; niche: string }
  report: ReportData
  reauditUrl: string
}) {
  const score = report.overallScore
  const highWeakPoints = report.weakPoints.filter((w) => w.severity === "high").length

  return base(`
    ${eyebrow("День 45 · Пора замерить прогресс")}
    ${heading(`45 дней → пришло время проверить как изменился ${job.companyName}`)}

    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 20px;text-align:center">
      <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em">Score на момент аудита</p>
      <p style="margin:0;font-size:56px;font-weight:700;color:${score >= 60 ? "#22c55e" : score >= 30 ? "#f59e0b" : "#ef4444"};line-height:1">${score}</p>
      <p style="margin:4px 0 0;font-size:14px;color:#6b7280">/100</p>
    </div>

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 16px">
      Если вы внедрили хотя бы 3 рекомендации из плана — score должен был вырасти на 8–20 пунктов.
      Единственный способ узнать — провести новый аудит.
    </p>

    <div style="background:#fef2f2;border-radius:10px;padding:14px 16px;margin:0 0 20px">
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#dc2626">Зачем измерять именно сейчас?</p>
      <p style="margin:0;font-size:13px;color:#374151;line-height:1.6">
        AI-алгоритмы обновляются каждые 2–4 недели. Без замера вы не знаете что работает —
        и рискуете потратить следующие 45 дней на неэффективные действия.
      </p>
    </div>

    ${cta(`Запустить повторный аудит${score < 40 ? " (скидка 20%)" : ""} →`, `${reauditUrl}${score < 40 ? "&promo=REAUDIT20" : ""}`, "#111827")}

    <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0">
      ${highWeakPoints > 0 ? `В вашем аудите было ${highWeakPoints} критических пункта. Проверьте, закрыты ли они.` : "Хорошая динамика = правильная стратегия. Продолжайте."}
    </p>
  `)
}
