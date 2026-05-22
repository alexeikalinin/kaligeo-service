/**
 * outreach-agent — генерирует персонализированный контент письма для холодных рассылок.
 *
 * Отличие от cold-sequence (который отправляет по шаблону):
 * этот агент создаёт уникальный AI-текст под конкретного лида,
 * используя данные FreemiumScan если они есть.
 *
 * Вызывается из:
 * - trigger/cold-sequence.ts (опционально, для AI-персонализации)
 * - orchestrator (через invoke_outreach_agent)
 * - admin API при превью письма
 */

import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { prisma } from "../prisma"

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface OutreachEmailContent {
  subject: string
  bodyHtml: string          // готовый HTML-контент (без <html>/<body>)
  bodyText: string          // plain-text версия
  tone: "formal" | "casual" | "urgent"
  personalizationScore: number  // 0–100, насколько персонализировано
  highlights: string[]          // ключевые зацепки использованные в письме
}

export interface OutreachAgentInput {
  leadId: string
  sequenceStep: number   // 0 = первое касание, 1 = follow-up, 2+ = финальное
  campaignBrief?: string // опциональный контекст кампании (ниша, УТП, оффер)
}

export async function runOutreachAgent(input: OutreachAgentInput): Promise<OutreachEmailContent> {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: input.leadId },
    include: { outreachEmails: { orderBy: { sentAt: "desc" }, take: 3 } },
  })

  // Ищем FreemiumScan по домену сайта
  let scan = null
  if (lead.websiteUrl) {
    try {
      const domain = new URL(lead.websiteUrl).hostname.replace(/^www\./, "")
      scan = await prisma.freemiumScan.findFirst({
        where: { websiteUrl: { contains: domain } },
        orderBy: { createdAt: "desc" },
      })
    } catch {
      // невалидный URL — продолжаем без скана
    }
  }

  const stepContext = {
    0: "Первое касание. Тон — мягкий, ценностный. Не продавай, помоги осознать проблему.",
    1: "Второе письмо. Покажи конкретный кейс или боль из ниши. Упомяни, что уже писал.",
    2: "Финальное письмо. Очень коротко. Без давления. Оставь дверь открытой.",
  }[Math.min(input.sequenceStep, 2)]

  const previousSubjects =
    lead.outreachEmails.length > 0
      ? `\nПредыдущие темы писем:\n${lead.outreachEmails.map((e) => `- "${e.subject}"`).join("\n")}`
      : ""

  const scanContext = scan
    ? `\nДанные фримиум-скана:
- AI Score: ${scan.previewScore}/100
- Конкуренты в нише: ${scan.suggestedCompetitors.slice(0, 3).join(", ")}
- Ключевые слова: ${(scan.keywords as string[]).slice(0, 5).join(", ")}`
    : ""

  const prompt = `Ты пишешь персонализированное холодное письмо от имени KaliGEO — сервиса AI-аудита видимости брендов в ChatGPT, Gemini, Perplexity и других AI-поисковиках.

Данные о получателе:
- Компания: ${lead.companyName}
- Ниша: ${lead.niche ?? "не указана"}
- Город: ${lead.city ?? "не указан"}
- Сайт: ${lead.websiteUrl ?? "не указан"}${scanContext}${previousSubjects}
${input.campaignBrief ? `\nКонтекст кампании: ${input.campaignBrief}` : ""}

Шаг последовательности: ${input.sequenceStep + 1}
${stepContext}

Правила:
- 3–5 коротких абзацев, без воды
- Персонализация должна быть реальной — используй детали ниши, города, скана
- Не звучи как шаблон ("Здравствуйте! Меня зовут..." — табу)
- CTA — попробовать скан на app.kaligeo.ru/chat (или посмотреть результаты если есть score)
- Письмо на русском языке

Верни строго JSON без markdown-обёртки:
{
  "subject": "тема письма (до 60 символов)",
  "bodyHtml": "HTML-контент письма (только теги внутри body, без html/head/body)",
  "bodyText": "plain text версия того же письма",
  "tone": "formal|casual|urgent",
  "personalizationScore": 0-100,
  "highlights": ["зацепка 1", "зацепка 2"]
}`

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt,
    temperature: 0.75,
  })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("[outreach-agent] Не удалось распарсить JSON из ответа")

  return JSON.parse(jsonMatch[0]) as OutreachEmailContent
}
