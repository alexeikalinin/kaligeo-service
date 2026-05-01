import { streamText, stepCountIs, convertToModelMessages } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { z } from "zod"

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Ты — ИИ-ассистент сервиса KaliGEO. Твоя задача — помочь клиенту запустить AI-аудит видимости его бренда в поисковых ИИ-системах (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, YandexGPT, GigaChat).

Веди непринуждённый диалог. Задавай вопросы по одному, не все сразу. Собери следующие данные:
1. Название компании
2. URL сайта (должен начинаться с http:// или https://)
3. Ниша или направление бизнеса (2-3 предложения — чем занимается, кто клиенты)
4. Основные конкуренты (необязательно, до 5 штук через запятую — если не знает, пропусти)
5. Email для отправки готового отчёта

Когда все обязательные данные собраны (компания, сайт, ниша, email) — подтверди их и вызови инструмент submit_audit.

Говори на том же языке, что и пользователь. Будь дружелюбным и профессиональным.`

const submitAuditSchema = z.object({
  companyName: z.string().describe("Название компании"),
  websiteUrl: z.string().url().describe("URL сайта"),
  niche: z.string().describe("Ниша и описание бизнеса"),
  competitors: z.array(z.string()).default([]).describe("Список конкурентов"),
  clientEmail: z.string().email().describe("Email для отправки отчёта"),
  tier: z.enum(["BASIC", "STANDARD", "ADVANCED"]).default("STANDARD"),
})

type SubmitAuditInput = z.infer<typeof submitAuditSchema>

async function executeSubmitAudit(params: SubmitAuditInput) {
  const { companyName, websiteUrl, niche, competitors, clientEmail, tier } = params
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/audit/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName, websiteUrl, niche, competitors, clientEmail, tier }),
  })

  if (!res.ok) {
    const err = (await res.json()) as { error?: string }
    return { success: false, error: err.error ?? "Ошибка запуска аудита" }
  }

  const data = (await res.json()) as { jobId: string }
  return { success: true, jobId: data.jobId }
}

export async function POST(req: Request) {
  const { messages: uiMessages } = await req.json()
  const messages = await convertToModelMessages(uiMessages)

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    messages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: {
      submit_audit: {
        description: "Запустить AI-аудит после сбора всех необходимых данных",
        parameters: submitAuditSchema,
        execute: executeSubmitAudit,
      },
    } as any,
    stopWhen: stepCountIs(10),
  })

  return result.toUIMessageStreamResponse()
}
