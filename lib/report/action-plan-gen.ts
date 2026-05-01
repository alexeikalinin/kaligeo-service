import Anthropic from "@anthropic-ai/sdk"
import type { WeakPoint } from "../analysis/weak-points-checker"
import type { PlatformScore } from "../analysis/calculate-scores"

export interface ActionItem {
  title: string
  description: string
  effort: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
}

export interface ActionPlan {
  "30d": ActionItem[]
  "60d": ActionItem[]
  "90d": ActionItem[]
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function generateActionPlan(
  companyName: string,
  niche: string,
  weakPoints: WeakPoint[],
  platformScores: Record<string, PlatformScore>,
  overallScore: number
): Promise<ActionPlan> {
  const weakPointsSummary = weakPoints.map((w) => `- ${w.title}: ${w.description}`).join("\n")
  const scoresSummary = Object.values(platformScores)
    .map((s) => `${s.platform}: ${s.score}/100 (${s.citationRate}% citation rate)`)
    .join("\n")

  const prompt = `You are an AI search visibility expert. Create a prioritized 30/60/90-day action plan.

Company: ${companyName}
Niche: ${niche}
Overall AI Visibility Score: ${overallScore}/100

Platform Scores:
${scoresSummary}

Identified Weak Points:
${weakPointsSummary}

Return a JSON object with this exact structure:
{
  "30d": [{"title": "...", "description": "...", "effort": "low|medium|high", "impact": "low|medium|high"}],
  "60d": [...],
  "90d": [...]
}

Rules:
- 30d: quick wins, 3-5 items, low effort / high impact
- 60d: medium-term content & technical fixes, 3-4 items
- 90d: strategic entity building and authority, 2-3 items
- Be specific to the company's niche
- Focus on AI visibility, not traditional SEO
- Write in Russian`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Failed to parse action plan JSON")

  return JSON.parse(jsonMatch[0]) as ActionPlan
}
