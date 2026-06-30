import { schedules } from "@trigger.dev/sdk/v3"
import { Resend } from "resend"
import { prisma } from "../lib/prisma"

function getResend() {
  return new Resend(process.env.RESEND_API_KEY ?? "re_placeholder")
}
const FROM = () => process.env.FROM_EMAIL ?? "hello@kaligeo.ru"
const APP_URL = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"

const MONITOR_TIERS = new Set(["MONITOR_START", "MONITOR_PRO", "MONITOR_AGENT"])

// GEO-совет месяца — ротируется по индексу месяца
const MONTHLY_GEO_TIPS = [
  {
    title: "Добавьте llms.txt в корень сайта",
    body: "Новый стандарт 2025 года — файл-инструкция для AI-краулеров. Укажите: Allow: /blog, Allow: /faq, Allow: /about. Аналог robots.txt, но для LLM.",
    effort: "15 минут",
  },
  {
    title: "Обновите Schema.org разметку",
    body: "Добавьте или обновите JSON-LD с типом Organization: name, url, description, foundingDate, sameAs (LinkedIn, Wikipedia). Это основа Entity Recognition.",
    effort: "30 минут",
  },
  {
    title: "Создайте FAQ-страницу с ответами ≤60 слов",
    body: "AI цитирует FAQ дословно, если ответы короткие и структурированные. Добавьте FAQPage schema. Целевой формат: вопрос + ответ 40-60 слов.",
    effort: "2-3 часа",
  },
  {
    title: "Проверьте Яндекс Бизнес",
    body: "Алиса использует Яндекс Бизнес как основной источник для локальных рекомендаций. Убедитесь что карточка заполнена на 100%: описание, часы, категории, фото.",
    effort: "45 минут",
  },
  {
    title: "Опубликуйте экспертный материал",
    body: "Статья на vc.ru, Habr или в отраслевом СМИ с вашим именем в авторах. Claude и Perplexity активно цитируют нишевых экспертов-практиков.",
    effort: "1-2 дня",
  },
  {
    title: "Добавьте Speakable разметку",
    body: "Schema.org Speakable указывает голосовым ассистентам какие фрагменты страницы зачитывать вслух. Разметьте H1, первый абзац описания и FAQ-ответы.",
    effort: "1 час",
  },
  {
    title: "Проверьте robots.txt для AI-ботов",
    body: "Убедитесь что YandexAdditionalBot, xAI и GPTBot не заблокированы в robots.txt. Заблокированный краулер = нулевая видимость на соответствующей платформе.",
    effort: "10 минут",
  },
  {
    title: "Создайте или обновите Wikipedia-статью",
    body: "ChatGPT берёт 40-48% информации из Wikipedia. Если о вашей компании нет статьи — создайте её. Если есть — проверьте актуальность данных.",
    effort: "3-5 часов",
  },
  {
    title: "Выйдите в отраслевые рейтинги и каталоги",
    body: "Catalogs.ru, 2GIS, профильные ТОП-списки — AI использует их как источники для рекомендаций. Подайте заявку в 2-3 отраслевых рейтинга.",
    effort: "2-4 часа",
  },
  {
    title: "Добавьте автора с credentials к статьям",
    body: "Claude цитирует контент с видимым автором-экспертом на 40% чаще. Добавьте Person schema: имя, должность, ссылки на LinkedIn и Wikidata.",
    effort: "1 час",
  },
  {
    title: "Опубликуйте оригинальное исследование",
    body: "Perplexity приоритизирует оригинальные данные. Даже небольшой опрос (50-100 клиентов) с конкретными цифрами становится цитируемым источником.",
    effort: "1-2 недели",
  },
  {
    title: "Создайте YouTube-контент с транскриптами",
    body: "YouTube входит в топ-3 источников Gemini. Загрузите видео с субтитрами и структурированным описанием по главам — Gemini индексирует транскрипты.",
    effort: "1-2 дня",
  },
]

export const monitorDigest = schedules.task({
  id: "monitor-digest",
  // 1-го числа каждого месяца в 8:00 UTC
  cron: "0 8 1 * *",

  run: async () => {
    const now = new Date()
    const monthIdx = now.getMonth() // 0-11
    const monthName = now.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    const geoTip = MONTHLY_GEO_TIPS[monthIdx % MONTHLY_GEO_TIPS.length]

    // 30 дней назад
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Найти всех активных MONITOR-клиентов
    const activeJobs = await prisma.auditJob.findMany({
      where: {
        subscriptionActiveUntil: { gt: now },
        status: "COMPLETED",
        emailOptOut: false,
      },
      orderBy: { completedAt: "desc" },
    })

    // Дедупликация по email
    const byEmail = new Map<string, typeof activeJobs[number]>()
    for (const job of activeJobs) {
      if (!MONITOR_TIERS.has(job.subscriptionTier ?? "")) continue
      if (!byEmail.has(job.clientEmail)) {
        byEmail.set(job.clientEmail, job)
      }
    }

    console.log(`[monitor-digest] Sending to ${byEmail.size} active MONITOR clients`)

    let sent = 0
    for (const [email, latestJob] of byEmail) {
      try {
        // Текущий отчёт
        const latestReport = await prisma.report.findUnique({
          where: { jobId: latestJob.id },
          select: { overallScore: true, visibilityScores: true },
        })
        if (!latestReport) continue

        // Отчёт ~30 дней назад
        const prevJob = await prisma.auditJob.findFirst({
          where: {
            clientEmail: email,
            status: "COMPLETED",
            completedAt: { lte: thirtyDaysAgo },
          },
          include: { report: { select: { overallScore: true, visibilityScores: true } } },
          orderBy: { completedAt: "desc" },
        })

        const currentScore = latestReport.overallScore
        const prevScore = prevJob?.report?.overallScore ?? null
        const scoreDelta = prevScore !== null ? currentScore - prevScore : null

        // Анализ платформ
        type PS = { score: number; mentionCount: number; totalQueries: number }
        const currentScores = latestReport.visibilityScores as Record<string, PS>
        const prevScores = prevJob?.report?.visibilityScores as Record<string, PS> | null

        const platforms = Object.entries(currentScores).map(([platform, s]) => {
          const prev = prevScores?.[platform]?.score ?? null
          const delta = prev !== null ? s.score - prev : null
          return { platform, score: s.score, delta }
        }).sort((a, b) => {
          // Топ по динамике (лучшие и худшие)
          if (a.delta !== null && b.delta !== null) return Math.abs(b.delta) - Math.abs(a.delta)
          return b.score - a.score
        })

        const bestPlatforms = platforms.filter((p) => (p.delta ?? 0) > 0).slice(0, 2)
        const warnPlatforms = platforms.filter((p) => (p.delta ?? 0) < -5 || p.score < 25).slice(0, 2)

        const reportUrl = `${APP_URL()}/report/${latestJob.id}?token=${latestJob.reportToken}`
        const dashboardUrl = `${APP_URL()}/my/dashboard`
        const unsub = `${APP_URL()}/api/audit/unsubscribe?jobId=${latestJob.id}`

        await getResend().emails.send({
          from: FROM(),
          to: email,
          subject: `${latestJob.companyName}: AI-видимость за ${monthName} — дайджест`,
          html: buildDigestEmail({
            companyName: latestJob.companyName,
            monthName,
            currentScore,
            prevScore,
            scoreDelta,
            bestPlatforms,
            warnPlatforms,
            geoTip,
            reportUrl,
            dashboardUrl,
            unsub,
          }),
        })

        sent++
      } catch (err) {
        console.error(`[monitor-digest] Failed for ${email}:`, err)
      }
    }

    console.log(`[monitor-digest] Done. Sent: ${sent}/${byEmail.size}`)
    return { total: byEmail.size, sent }
  },
})

function buildDigestEmail({
  companyName, monthName, currentScore, prevScore, scoreDelta,
  bestPlatforms, warnPlatforms, geoTip, reportUrl, dashboardUrl, unsub,
}: {
  companyName: string
  monthName: string
  currentScore: number
  prevScore: number | null
  scoreDelta: number | null
  bestPlatforms: { platform: string; score: number; delta: number | null }[]
  warnPlatforms: { platform: string; score: number; delta: number | null }[]
  geoTip: { title: string; body: string; effort: string }
  reportUrl: string
  dashboardUrl: string
  unsub: string
}) {
  const scoreColor = currentScore >= 60 ? "#22c55e" : currentScore >= 30 ? "#f59e0b" : "#ef4444"
  const deltaColor = (scoreDelta ?? 0) > 0 ? "#16a34a" : (scoreDelta ?? 0) < 0 ? "#dc2626" : "#6b7280"
  const deltaStr = scoreDelta !== null
    ? (scoreDelta > 0 ? `↑ +${scoreDelta}` : scoreDelta < 0 ? `↓ ${scoreDelta}` : "→ 0")
    : "—"

  const platformRows = (items: typeof bestPlatforms, isWarn: boolean) =>
    items.map((p) => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6">
        <span style="font-size:14px;font-weight:500;color:#111827">${p.platform}</span>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:14px;font-weight:700;color:${isWarn ? "#dc2626" : "#22c55e"}">${p.score}</span>
          ${p.delta !== null ? `<span style="font-size:12px;color:${p.delta > 0 ? "#16a34a" : "#dc2626"};font-family:monospace">${p.delta > 0 ? `+${p.delta}` : p.delta}</span>` : ""}
        </div>
      </div>`).join("")

  return `<!DOCTYPE html><html lang="ru">
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:0;color:#111827">
<div style="max-width:580px;margin:0 auto;padding:32px 20px">
  <div style="text-align:center;margin-bottom:28px">
    <span style="font-family:monospace;font-weight:700;font-size:13px;letter-spacing:.12em;text-transform:uppercase">KaliGEO</span>
  </div>
  <div style="background:#fff;border-radius:16px;padding:32px;border:1px solid #e5e7eb">

    <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-family:monospace">Ежемесячный дайджест · ${monthName}</p>
    <h1 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827">${companyName}: AI-видимость за месяц</h1>

    <!-- Score block -->
    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:0 0 24px;text-align:center">
      <div style="display:inline-flex;align-items:baseline;gap:8px">
        <span style="font-size:64px;font-weight:700;color:${scoreColor};line-height:1">${currentScore}</span>
        <span style="font-size:20px;color:#9ca3af">/100</span>
      </div>
      ${scoreDelta !== null ? `
      <div style="margin-top:8px">
        <span style="font-size:18px;font-weight:600;color:${deltaColor}">${deltaStr}</span>
        <span style="font-size:13px;color:#9ca3af;margin-left:6px">за 30 дней</span>
      </div>` : ""}
      ${prevScore !== null ? `<p style="margin:6px 0 0;font-size:12px;color:#9ca3af">Был: ${prevScore} → Стал: ${currentScore}</p>` : ""}
    </div>

    <!-- Best platforms -->
    ${bestPlatforms.length > 0 ? `
    <div style="margin:0 0 20px">
      <p style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;font-family:monospace;margin:0 0 10px">Лучшая динамика</p>
      ${platformRows(bestPlatforms, false)}
    </div>` : ""}

    <!-- Warn platforms -->
    ${warnPlatforms.length > 0 ? `
    <div style="margin:0 0 20px">
      <p style="font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.08em;font-family:monospace;margin:0 0 10px">Требуют внимания</p>
      ${platformRows(warnPlatforms, true)}
    </div>` : ""}

    <!-- Monthly GEO tip -->
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:18px;margin:0 0 24px">
      <p style="margin:0 0 4px;font-size:11px;color:#15803d;text-transform:uppercase;letter-spacing:.08em;font-family:monospace">Совет месяца</p>
      <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:#111827">${geoTip.title}</p>
      <p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.6">${geoTip.body}</p>
      <span style="font-size:12px;background:#fff;border:1px solid #d1fae5;padding:3px 8px;border-radius:6px;color:#6b7280">⏱ ${geoTip.effort}</span>
    </div>

    <!-- CTAs -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <a href="${reportUrl}" style="display:block;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;color:#374151">
        Открыть отчёт
      </a>
      <a href="${dashboardUrl}" style="display:block;background:#111827;border-radius:8px;padding:12px;text-align:center;text-decoration:none;font-size:13px;font-weight:600;color:#fff">
        Личный кабинет →
      </a>
    </div>

  </div>
  <p style="text-align:center;margin-top:16px;font-size:11px;color:#9ca3af">
    KaliGEO · AI Search Visibility · <a href="${unsub}" style="color:#9ca3af">Отписаться</a>
  </p>
</div>
</body></html>`
}
