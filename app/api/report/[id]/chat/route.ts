import { NextRequest, NextResponse } from "next/server"
import { streamText, stepCountIs } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { prisma } from "@/lib/prisma"
import { canUsePostAuditChat, isChatLimitReached, type Tier } from "@/lib/gates"

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { token, messages } = await req.json()

  const job = await prisma.auditJob.findUnique({
    where: { id },
    include: { report: true },
  })

  if (!job || job.reportToken !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (job.status !== "COMPLETED" || !job.report) {
    return NextResponse.json({ error: "Report not ready" }, { status: 400 })
  }

  const tier = job.tier as Tier

  if (!canUsePostAuditChat(tier)) {
    return NextResponse.json(
      { error: "upgrade_required", tier: "STANDARD" },
      { status: 403 }
    )
  }

  if (isChatLimitReached(tier, job.chatMessagesUsed)) {
    return NextResponse.json(
      { error: "chat_limit_reached", used: job.chatMessagesUsed, tier },
      { status: 429 }
    )
  }

  // Increment usage counter before streaming (even if client disconnects)
  await prisma.auditJob.update({
    where: { id },
    data: { chatMessagesUsed: { increment: 1 } },
  })

  const report = job.report as unknown as {
    overallScore: number
    visibilityScores: Record<string, { platform: string; score: number; citationRate: number; mentionCount: number; totalQueries: number }>
    competitorMatrix: { name: string; platforms: string[]; mentionCount: number }[]
    weakPoints: { id: string; title: string; description: string; severity: string; detected: boolean }[]
    actionPlan: { "30d": { title: string; description: string; effort: string; impact: string }[]; "60d": { title: string; description: string; effort: string; impact: string }[]; "90d": { title: string; description: string; effort: string; impact: string }[] }
  }

  const platformSummary = Object.values(report.visibilityScores)
    .map((s) => `${s.platform}: ${s.score}/100 (упоминаний: ${s.mentionCount}/${s.totalQueries})`)
    .join("\n")

  const weakPointsSummary = report.weakPoints
    .filter((w) => w.detected)
    .map((w) => `[${w.severity.toUpperCase()}] ${w.title}: ${w.description}`)
    .join("\n")

  const topActions = report.actionPlan["30d"]
    .map((a, i) => `${i + 1}. ${a.title} (усилия: ${a.effort}, эффект: ${a.impact})`)
    .join("\n")

  const competitorSummary = report.competitorMatrix
    .slice(0, 5)
    .map((c) => `${c.name}: ${c.mentionCount} упоминаний на [${c.platforms.join(", ")}]`)
    .join("\n")

  const SYSTEM_PROMPT = `Ты — эксперт по AI-видимости брендов. Отвечаешь на вопросы по результатам аудита компании "${job.companyName}".

ДАННЫЕ АУДИТА:
Ниша: ${job.niche}
Сайт: ${job.websiteUrl}
Общий AI Score: ${report.overallScore}/100

Платформы:
${platformSummary}

Конкуренты (топ по упоминаниям):
${competitorSummary || "Конкуренты не указаны"}

Слабые места:
${weakPointsSummary || "Критических проблем не выявлено"}

Приоритеты на 30 дней:
${topActions || "План не сгенерирован"}

ПРАВИЛА:
- Отвечай конкретно, ссылайся на числа из аудита
- Если клиент спрашивает "что делать" — давай конкретные шаги, не общие советы
- Если вопрос вне контекста аудита — мягко переводи обратно
- Отвечай на том же языке что клиент (обычно русский)`

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    messages,
    stopWhen: stepCountIs(1),
  })

  return result.toUIMessageStreamResponse()
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get("token")

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const job = await prisma.auditJob.findUnique({
    where: { id },
    select: { tier: true, chatMessagesUsed: true, reportToken: true },
  })

  if (!job || job.reportToken !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const tier = job.tier as Tier
  const limit = tier === "ADVANCED" ? null : tier === "STANDARD" ? 10 : 0

  return NextResponse.json({
    tier,
    chatMessagesUsed: job.chatMessagesUsed,
    chatMessageLimit: limit,
    canChat: canUsePostAuditChat(tier),
    limitReached: limit !== null && job.chatMessagesUsed >= limit,
  })
}
