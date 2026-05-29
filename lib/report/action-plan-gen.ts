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

  // Алиса-блок: подключаем когда скор критически низкий
  const alisaScore = platformScores["Alisa"]?.score ?? platformScores["alisa"]?.score ?? null
  const alisaContext = alisaScore !== null && alisaScore < 40
    ? `\nАЛИСА-ПРИОРИТЕТЫ (скор ${alisaScore}/100): Яндекс Бизнес регистрация, Speakable Schema.org разметка, FAQ-страница с ответами ≤60 слов, отзывы на Яндекс Картах, проверка YandexAdditionalBot в robots.txt, добавление llms.txt в корень сайта.`
    : ""

  // Фреймворк 5 типов запросов: подсказываем агенту
  const queryTypesContext = `
Типы запросов для AI-видимости (охватывай все 5 типов в плане):
- Категорийные: "лучший X", "топ сервисов" — попасть в списки
- Коммерческие: "цена", "купить", "тариф" — быть в коммерческих рекомендациях
- Проблемные: "как сделать", "решение" — стать ответом на проблему
- Сравнительные: "X vs Y", "что лучше" — попасть в сравнения
- Брендовые: прямые запросы с названием бренда — управлять нарративом`

  const prompt = `Ты эксперт по AI-видимости брендов (GEO — Generative Engine Optimization). Создай приоритизированный 30/60/90-дневный план действий.

Компания: ${companyName}
Ниша: ${niche}
Общий AI Score: ${overallScore}/100
${alisaContext}

Scores по платформам:
${scoresSummary}

Слабые места:
${weakPointsSummary}
${queryTypesContext}

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
- Конкретно под нишу компании, не общие советы
- Фокус на AI-видимости (GEO), не классическом SEO
- Если Алиса в слабых местах — включи Алиса-специфичные задачи в 30d
- На русском языке`

  const { text } = await generateText({ model, prompt, maxOutputTokens: 2000 })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Failed to parse action plan JSON")

  return JSON.parse(jsonMatch[0]) as ActionPlan
}
