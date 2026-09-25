import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AI_CLIENTS } from "@/lib/ai-clients"
import { runWebsiteAnalysisAgent } from "@/lib/agents/website-analysis-agent"
import { buildQueryGenPrompt } from "@/trigger/steps/generate-queries"

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
    const raw = await client.query(prompt, "Отвечай ТОЛЬКО валидным JSON без markdown-блоков, без пояснений.")
    const queries = extractQueries(raw)
    return NextResponse.json({ platform, analysis, queries, ms: Date.now() - t0 })
  } catch (e) {
    return NextResponse.json({ platform, error: String(e), ms: Date.now() - t0 }, { status: 500 })
  }
}
