import { streamText, stepCountIs, convertToModelMessages } from "ai"
import { z } from "zod"
import { runWebsiteAnalysisAgent } from "@/lib/agents/website-analysis-agent"
import { CHAT_MODEL } from "@/lib/models"

const SYSTEM_PROMPT = `Ты — ИИ-ассистент сервиса KaliGEO. Твоя задача — помочь клиенту запустить AI-аудит видимости его бренда в поисковых ИИ-системах (ChatGPT, Claude, Gemini, Perplexity, DeepSeek, YandexGPT, GigaChat).

Веди непринуждённый диалог. Задавай вопросы по одному, не все сразу.

КАК ТОЛЬКО пользователь называет URL сайта — сразу вызови инструмент analyze_website, не спрашивая ничего другого.
После анализа — прочитай результаты вслух (название компании, ниша, услуги) и спроси, всё ли верно.
Это сэкономит клиенту время — не нужно описывать бизнес вручную.

Собери следующие данные:
1. Название компании (из анализа сайта или от пользователя)
2. URL сайта (должен начинаться с http:// или https://)
3. Ниша или направление бизнеса (из анализа сайта или от пользователя)
4. Основные конкуренты (необязательно, до 5 штук — можно взять из анализа сайта, уточнить у пользователя)
5. Email для отправки готового отчёта

Когда все обязательные данные собраны (компания, сайт, ниша, email) — подтверди итоговые данные и вызови submit_audit.

Говори на том же языке, что и пользователь. Будь дружелюбным и профессиональным.`

const analyzeWebsiteSchema = z.object({
  websiteUrl: z.string().url().describe("URL сайта для анализа"),
})

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
    model: CHAT_MODEL,
    system: SYSTEM_PROMPT,
    messages,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tools: {
      analyze_website: {
        description:
          "Проанализировать сайт компании и извлечь название, нишу, услуги, ключевые слова и возможных конкурентов",
        parameters: analyzeWebsiteSchema,
        execute: async ({ websiteUrl }: { websiteUrl: string }) => {
          const result = await runWebsiteAnalysisAgent(websiteUrl)
          return result
        },
      },
      submit_audit: {
        description: "Запустить AI-аудит после сбора всех необходимых данных",
        parameters: submitAuditSchema,
        execute: executeSubmitAudit,
      },
    } as any,
    stopWhen: stepCountIs(15),
  })

  return result.toUIMessageStreamResponse()
}
