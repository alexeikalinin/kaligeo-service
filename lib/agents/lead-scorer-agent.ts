/**
 * lead-scorer-agent — приоритизирует лидов по потенциалу конверсии.
 *
 * Анализирует Lead + FreemiumScan (если есть) и возвращает:
 * - приоритет: hot/warm/cold
 * - обоснование (для отображения в admin UI)
 * - рекомендуемое действие (что делать прямо сейчас)
 * - оценочный score 0–100
 *
 * Логика без LLM (правила + эвристики) — быстро и дёшево.
 * Опциональный LLM-блок для narrative reasoning если нужен.
 *
 * Вызывается из:
 * - app/api/admin/leads/route.ts (при загрузке списка)
 * - trigger/enrich-leads.ts (после обогащения)
 * - orchestrator (через invoke_lead_scorer_agent)
 */

import { prisma } from "../prisma"

export type LeadPriority = "hot" | "warm" | "cold"

export interface LeadScore {
  leadId: string
  priority: LeadPriority
  score: number              // 0–100
  signals: string[]          // что повлияло на оценку (позитивные сигналы)
  redFlags: string[]         // что снизило оценку
  recommendedAction: string  // конкретное следующее действие
  suggestedSequenceStep: number // с какого шага последовательности начинать
  estimatedConversionPct: number // грубая оценка вероятности конверсии
}

export async function runLeadScorerAgent(leadId: string): Promise<LeadScore> {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { outreachEmails: true },
  })

  // Ищем FreemiumScan по домену
  let scan = null
  if (lead.websiteUrl) {
    try {
      const domain = new URL(lead.websiteUrl).hostname.replace(/^www\./, "")
      scan = await prisma.freemiumScan.findFirst({
        where: { websiteUrl: { contains: domain } },
        orderBy: { createdAt: "desc" },
      })
    } catch {
      // невалидный URL
    }
  }

  let score = 0
  const signals: string[] = []
  const redFlags: string[] = []

  // ── Сигналы из FreemiumScan ──────────────────────────────────────────────
  if (scan) {
    signals.push(`Прошёл бесплатный скан (AI Score: ${scan.previewScore}/100)`)
    score += 20  // уже взаимодействовал с продуктом

    if (scan.previewScore < 25) {
      score += 25  // низкий score = высокая боль = высокая мотивация
      signals.push(`Критически низкий AI Score (${scan.previewScore}/100) — максимальная боль`)
    } else if (scan.previewScore < 40) {
      score += 15
      signals.push(`Низкий AI Score (${scan.previewScore}/100) — есть очевидная потребность`)
    } else if (scan.previewScore < 60) {
      score += 8
      signals.push(`Средний AI Score (${scan.previewScore}/100) — потенциал для роста`)
    }

    if (scan.emailCaptured) {
      score += 15  // оставил email = высокий интерес
      signals.push("Оставил email после скана")
    }
  }

  // ── Обогащение (есть email от Hunter.io) ─────────────────────────────────
  if (lead.enrichedEmail) {
    score += 10
    signals.push("Email верифицирован через Hunter.io")
  } else if (lead.email) {
    score += 5
    signals.push("Email указан")
  } else {
    redFlags.push("Нет контактного email")
    score -= 10
  }

  // ── Наличие сайта ─────────────────────────────────────────────────────────
  if (lead.websiteUrl) {
    score += 5
    signals.push("Сайт указан")
  } else {
    redFlags.push("Нет сайта — сложно персонализировать")
    score -= 5
  }

  // ── Наличие ниши ─────────────────────────────────────────────────────────
  if (lead.niche) {
    score += 5
    signals.push(`Ниша определена: ${lead.niche}`)
  } else {
    redFlags.push("Ниша не указана — персонализация ограничена")
  }

  // ── История контактов ─────────────────────────────────────────────────────
  const sentEmails = lead.outreachEmails.filter((e) => e.sentAt)
  const openedEmails = lead.outreachEmails.filter((e) => e.openedAt)
  const clickedEmails = lead.outreachEmails.filter((e) => e.clickedAt)

  if (clickedEmails.length > 0) {
    score += 20
    signals.push(`Кликнул по ${clickedEmails.length} письмам — активный интерес`)
  } else if (openedEmails.length > 0) {
    score += 10
    signals.push(`Открыл ${openedEmails.length} из ${sentEmails.length} писем`)
  } else if (sentEmails.length > 0) {
    redFlags.push(`Не открыл ни одно из ${sentEmails.length} писем`)
    score -= 5
  }

  // ── Статус лида ──────────────────────────────────────────────────────────
  if (lead.status === "REPLIED") {
    score += 30
    signals.push("Ответил на письмо — горячий лид!")
  } else if (lead.status === "CONVERTED") {
    score = 100
    signals.push("Уже конвертирован")
  } else if (lead.status === "UNSUBSCRIBED") {
    score = 0
    redFlags.push("Отписался от рассылки")
  }

  // Нормализуем score
  score = Math.max(0, Math.min(100, score))

  // ── Приоритет ────────────────────────────────────────────────────────────
  let priority: LeadPriority
  if (score >= 60) priority = "hot"
  else if (score >= 30) priority = "warm"
  else priority = "cold"

  // ── Рекомендуемое действие ───────────────────────────────────────────────
  let recommendedAction: string
  let suggestedSequenceStep: number
  let estimatedConversionPct: number

  if (lead.status === "CONVERTED") {
    recommendedAction = "Лид уже конвертирован. Убедитесь что аудит запущен."
    suggestedSequenceStep = 0
    estimatedConversionPct = 100
  } else if (lead.status === "UNSUBSCRIBED") {
    recommendedAction = "Не контактировать. Лид отписался."
    suggestedSequenceStep = 0
    estimatedConversionPct = 0
  } else if (lead.status === "REPLIED") {
    recommendedAction = "Ответить лично в течение 24 часов. Предложить демо или специальные условия."
    suggestedSequenceStep = 0
    estimatedConversionPct = 45
  } else if (clickedEmails.length > 0) {
    recommendedAction = "Позвонить или написать персональное письмо. Предложить бесплатный полный аудит."
    suggestedSequenceStep = 1
    estimatedConversionPct = 25
  } else if (scan && !scan.emailCaptured) {
    recommendedAction = "Сделал скан но не оставил email. Попробовать retargeting или выход через LinkedIn."
    suggestedSequenceStep = 0
    estimatedConversionPct = 8
  } else if (!lead.email && !lead.enrichedEmail) {
    recommendedAction = "Найти контактный email вручную или через Hunter.io прежде чем контактировать."
    suggestedSequenceStep = 0
    estimatedConversionPct = 3
  } else if (sentEmails.length === 0) {
    recommendedAction = "Запустить холодную последовательность. Первое письмо с результатами скана если есть."
    suggestedSequenceStep = 0
    estimatedConversionPct = priority === "hot" ? 15 : priority === "warm" ? 7 : 3
  } else {
    recommendedAction = `Продолжить последовательность (шаг ${sentEmails.length + 1}). Переключить на другой угол подачи.`
    suggestedSequenceStep = sentEmails.length
    estimatedConversionPct = 5
  }

  return {
    leadId,
    priority,
    score,
    signals,
    redFlags,
    recommendedAction,
    suggestedSequenceStep,
    estimatedConversionPct,
  }
}

/**
 * Массовая оценка лидов — для отображения в admin UI.
 * Возвращает упорядоченный список по score desc.
 */
export async function scoreAllLeads(
  filter: { status?: string; niche?: string } = {}
): Promise<LeadScore[]> {
  const leads = await prisma.lead.findMany({
    where: {
      ...(filter.status ? { status: filter.status as any } : { status: { notIn: ["CONVERTED", "UNSUBSCRIBED"] } }),
      ...(filter.niche ? { niche: { contains: filter.niche, mode: "insensitive" } } : {}),
    },
    select: { id: true },
    take: 100,
    orderBy: { createdAt: "desc" },
  })

  const scores = await Promise.allSettled(
    leads.map((l) => runLeadScorerAgent(l.id))
  )

  return scores
    .filter((r): r is PromiseFulfilledResult<LeadScore> => r.status === "fulfilled")
    .map((r) => r.value)
    .sort((a, b) => b.score - a.score)
}
