import { generateText } from "ai"
import { getActionPlanModel } from "../models"
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

export async function generateActionPlan(
  companyName: string,
  niche: string,
  weakPoints: WeakPoint[],
  platformScores: Record<string, PlatformScore>,
  overallScore: number,
  tier: "BASIC" | "STANDARD" | "ADVANCED" = "STANDARD"
): Promise<ActionPlan> {
  const model = getActionPlanModel(tier)

  // Basic — план не генерируем
  if (!model) return { "30d": [], "60d": [], "90d": [] }

  const weakPointsSummary = weakPoints.map((w) => `- ${w.title}: ${w.description}`).join("\n")
  const scoresSummary = Object.values(platformScores)
    .map((s) => `${s.platform}: ${s.score}/100 (${s.citationRate}% citation rate)`)
    .join("\n")

  const prompt = `Ты эксперт по AI-видимости брендов. Создай приоритизированный 30/60/90-дневный план действий.

Компания: ${companyName}
Ниша: ${niche}
Общий AI Score: ${overallScore}/100

Scores по платформам:
${scoresSummary}

Слабые места:
${weakPointsSummary}

Верни JSON строго в формате:
{
  "30d": [{"title": "...", "description": "...", "effort": "low|medium|high", "impact": "low|medium|high"}],
  "60d": [...],
  "90d": [...]
}

Правила:
- 30d: быстрые победы, 3-5 пунктов, низкие усилия / высокий эффект
- 60d: контентные и технические исправления, 3-4 пункта
- 90d: стратегическое построение авторитета, 2-3 пункта
- Конкретно под нишу компании
- Фокус на AI-видимости, не SEO
- На русском языке`

  const { text } = await generateText({ model, prompt, maxOutputTokens: 2000 })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Failed to parse action plan JSON")

  return JSON.parse(jsonMatch[0]) as ActionPlan
}
