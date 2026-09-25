import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import Anthropic from "@anthropic-ai/sdk"
import { AI_CLIENTS } from "@/lib/ai-clients"
import { runWebsiteAnalysisAgent } from "@/lib/agents/website-analysis-agent"
import { buildQueryGenPrompt, generateQueries } from "@/trigger/steps/generate-queries"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
}

function extractQueries(text: string): string[] {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned)
  return Array.isArray(parsed) ? parsed : (parsed.queries ?? [])
}

const JSON_SYSTEM_PROMPT = "Отвечай ТОЛЬКО валидным JSON без markdown-блоков, без пояснений."

/**
 * AI_CLIENTS[x].query() хардкодит max_tokens: 1000 — рассчитано на короткие
 * аудит-ответы, обрезает JSON с 30 вопросами на середине. Для этого
 * диагностического эндпоинта зовём API напрямую с бюджетом побольше, не трогая
 * прод-клиенты (там 1000 токенов — осознанный лимит стоимости на 6×N вызовов).
 */
async function queryWithHigherBudget(platform: string, prompt: string): Promise<string> {
  if (platform === "CLAUDE") {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: JSON_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    })
    const block = response.content[0]
    return block.type === "text" ? block.text : "{}"
  }
  if (platform === "PERPLEXITY") {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: JSON_SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        max_tokens: 4000,
      }),
    })
    if (!res.ok) throw new Error(`Perplexity error: ${res.status} ${await res.text()}`)
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? "{}"
  }
  // Остальные платформы — через обычный клиент (может обрезаться на 1000 токенов).
  const client = AI_CLIENTS[platform]
  return client.query(prompt, JSON_SYSTEM_PROMPT)
}

/**
 * Диагностический эндпоint: прогоняет реальный промпт генерации GEO-запросов
 * (тот же buildQueryGenPrompt, что использует прод-пайплайн) через выбранную
 * AI-платформу, чтобы сравнить качество вопросов между моделями. admin-only.
 */
export async function POST(req: Request) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { websiteUrl, platform, count = 30 } = await req.json()
  if (!websiteUrl || !platform) {
    return NextResponse.json({ error: "websiteUrl and platform are required" }, { status: 400 })
  }

  // ENSEMBLE — не отдельная платформа, а прогон прод-схемы генерации целиком
  // (2 генератора → детерминированный фильтр → judge), в отличие от веток
  // ниже, которые тестируют одну модель-генератор в изоляции.
  if (platform === "ENSEMBLE") {
    const t0 = Date.now()
    try {
      const analysis = await runWebsiteAnalysisAgent(websiteUrl)
      const siteContext = analysis.description
        ? { description: analysis.description, services: analysis.services ?? [], targetAudience: analysis.targetAudience ?? "" }
        : undefined
      const queries = await generateQueries(
        analysis.companyName || websiteUrl,
        analysis.niche || "Общее",
        analysis.suggestedCompetitors?.slice(0, 5) ?? [],
        "STANDARD",
        [],
        siteContext
      )
      return NextResponse.json({ platform, analysis, queries, ms: Date.now() - t0 })
    } catch (e) {
      return NextResponse.json({ platform, error: String(e), ms: Date.now() - t0 }, { status: 500 })
    }
  }

  const client = AI_CLIENTS[platform as keyof typeof AI_CLIENTS]
  if (!client) {
    return NextResponse.json({ error: `Unknown platform: ${platform}` }, { status: 400 })
  }
  if (!client.isConfigured()) {
    return NextResponse.json({ error: `${platform} not configured` }, { status: 400 })
  }

  const analysis = await runWebsiteAnalysisAgent(websiteUrl)
  const siteContext = analysis.description
    ? { description: analysis.description, services: analysis.services ?? [], targetAudience: analysis.targetAudience ?? "" }
    : undefined

  const prompt = buildQueryGenPrompt(
    analysis.companyName || websiteUrl,
    analysis.niche || "Общее",
    analysis.suggestedCompetitors?.slice(0, 5) ?? [],
    count,
    siteContext
  )

  const t0 = Date.now()
  try {
    const raw = await queryWithHigherBudget(platform, prompt)
    const queries = extractQueries(raw)
    return NextResponse.json({ platform, analysis, queries, ms: Date.now() - t0 })
  } catch (e) {
    return NextResponse.json({ platform, error: String(e), ms: Date.now() - t0 }, { status: 500 })
  }
}
