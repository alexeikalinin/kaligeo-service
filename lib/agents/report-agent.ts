import Anthropic from "@anthropic-ai/sdk"
import { prisma } from "../prisma"
import type { ActionPlan } from "../report/action-plan-gen"

type ReportSection = "actionPlan" | "executiveSummary" | "platformNotes"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runReportAgent(
  jobId: string,
  section: ReportSection
): Promise<Record<string, unknown>> {
  const job = await prisma.auditJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { report: true },
  })

  if (!job.report) throw new Error("Report not found")

  const reportData = job.report as unknown as {
    visibilityScores: Record<string, { platform: string; score: number; citationRate: number }>
    weakPoints: { title: string; severity: string; detected: boolean }[]
    actionPlan: ActionPlan
    overallScore: number
  }

  if (section === "actionPlan") {
    const prompt = `Перегенерируй план роста AI-видимости для компании "${job.companyName}" (${job.niche}).

Текущий overall score: ${reportData.overallScore}/100
Слабые места: ${reportData.weakPoints.filter(w => w.detected).map(w => w.title).join(", ")}

Создай улучшенный 30/60/90-дневный план с учётом последних трендов AI-поиска.

Верни JSON:
{"30d": [...], "60d": [...], "90d": [...]}
Каждый элемент: {"title": "...", "description": "...", "effort": "low|medium|high", "impact": "low|medium|high"}`

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("Failed to parse action plan JSON")

    const newActionPlan = JSON.parse(jsonMatch[0])
    await prisma.report.update({
      where: { jobId },
      data: { actionPlan: newActionPlan },
    })

    return newActionPlan
  }

  if (section === "executiveSummary") {
    const scores = Object.values(reportData.visibilityScores)
      .map((s) => `${s.platform}: ${s.score}/100 (citation: ${s.citationRate}%)`)
      .join("\n")

    const prompt = `Напиши executive summary для AI-аудита компании "${job.companyName}".

Overall Score: ${reportData.overallScore}/100
Платформы:\n${scores}
Слабые места: ${reportData.weakPoints.filter(w => w.detected).map(w => w.title).join(", ")}

Формат: 3-4 абзаца. Ключевые выводы, сравнение с отраслью, приоритеты. На русском.`

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    })

    const summary = response.content[0].type === "text" ? response.content[0].text : ""
    return { executiveSummary: summary }
  }

  if (section === "platformNotes") {
    const scores = Object.values(reportData.visibilityScores)

    const prompt = `Напиши детальные заметки по каждой AI-платформе для компании "${job.companyName}" (${job.niche}).

Данные по платформам:
${scores.map(s => `${s.platform}: score=${s.score}, citationRate=${s.citationRate}%`).join("\n")}

Для каждой платформы: почему такой score, что делать для улучшения. На русском.`

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    })

    const notes = response.content[0].type === "text" ? response.content[0].text : ""
    return { platformNotes: notes }
  }

  throw new Error(`Unknown section: ${section}`)
}
