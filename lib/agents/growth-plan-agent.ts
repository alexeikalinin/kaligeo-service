import { generateText } from "ai"
import { getAdvancedAnalysisModel } from "../models"
import type { WeakPoint } from "../analysis/weak-points-checker"
import type { PlatformScore } from "../analysis/calculate-scores"

// Расширяет базовый ActionItem — опциональные поля, совместим со Standard
export interface GrowthActionItem {
  title: string
  description: string
  effort: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
  // Advanced-only поля:
  steps?: string[]           // конкретные шаги выполнения (что делать руками)
  expectedResult?: string    // ожидаемый результат в AI-видимости
  tools?: string[]           // инструменты, сервисы, ресурсы
  owner?: string             // кто отвечает: "маркетолог" | "разработчик" | "контент-менеджер"
}

export interface QuickWin {
  action: string       // одна конкретная задача
  howTo: string        // как именно сделать
  timeEstimate: string // "30 минут" / "2 часа" / "1 день"
  impact: string       // что изменится в AI-выдаче
}

export interface ContentTask {
  week: number
  theme: string
  tasks: string[]
}

export interface GrowthPlan {
  "30d": GrowthActionItem[]
  "60d": GrowthActionItem[]
  "90d": GrowthActionItem[]
  strategy: string               // общая стратегия в 2-3 предложениях
  quickWins: QuickWin[]          // топ-3 задачи которые можно сделать на этой неделе
  contentCalendar: ContentTask[] // контент-план по неделям (1-8)
  geoTacticsThisWeek?: { tactic: string; why: string; expectedEffect: string }[] // 3 GEO-тактики на эту неделю
}

export interface GrowthPlanInput {
  companyName: string
  niche: string
  websiteUrl: string
  overallScore: number
  weakPoints: WeakPoint[]
  platformScores: Record<string, PlatformScore>
  competitors: string[]
  competitorAnalysis?: string  // результат analysis-agent (competitors)
  gapsAnalysis?: string        // результат analysis-agent (gaps)
  contentRecommendations?: string // результат content-agent
}

export async function runGrowthPlanAgent(input: GrowthPlanInput): Promise<GrowthPlan> {
  const model = getAdvancedAnalysisModel()

  const weakPointsSummary = input.weakPoints
    .filter((w) => w.detected)
    .map((w) => `- [${w.severity.toUpperCase()}] ${w.title}: ${w.description}`)
    .join("\n")

  const scoresSummary = Object.values(input.platformScores)
    .map((s) => `${s.platform}: ${s.score}/100 (citation ${s.citationRate}%, mentions ${s.mentionCount}/${s.totalQueries})`)
    .join("\n")

  const contextBlocks = [
    input.competitorAnalysis && `=== АНАЛИЗ КОНКУРЕНТОВ ===\n${input.competitorAnalysis}`,
    input.gapsAnalysis       && `=== ПРОБЕЛЫ ВИДИМОСТИ ===\n${input.gapsAnalysis}`,
    input.contentRecommendations && `=== КОНТЕНТНЫЕ РЕКОМЕНДАЦИИ ===\n${input.contentRecommendations}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  const prompt = `Ты — старший консультант по GEO (Generative Engine Optimization) 2026. Твоя задача — создать детальный план роста AI-видимости, который команда клиента сможет выполнить самостоятельно.

Контекст GEO 2026: ChatGPT, Perplexity, Gemini, Claude, Яндекс Алиса используют RAG-системы — они извлекают информацию из авторитетных источников и ранжируют бренды на основе Entity Recognition, E-E-A-T сигналов и частоты цитирования в авторитетных источниках. Бренд, упоминаемый первым в ответе ИИ, имеет в 3-5 раз больше кликов, чем упомянутый вторым.

ДАННЫЕ АУДИТА:
Компания: ${input.companyName}
Сайт: ${input.websiteUrl}
Ниша: ${input.niche}
Конкуренты: ${input.competitors.join(", ")}
Общий AI Score: ${input.overallScore}/100

Scores по платформам:
${scoresSummary}

Подтверждённые слабые места:
${weakPointsSummary}

${contextBlocks}

---

Создай план внедрения и роста. Верни ТОЛЬКО валидный JSON без markdown-блоков:

{
  "strategy": "Общая GEO-стратегия в 2-3 предложениях — какие ключевые рычаги используем для роста позиции в AI-ответах",

  "geoTacticsThisWeek": [
    {
      "tactic": "Конкретная GEO-тактика на эту неделю (например: Создать FAQ-страницу под запросы 'топ [ниша]')",
      "why": "Почему это важно — какой GEO-сигнал усиливаем (Entity, E-E-A-T, RAG source, Position)",
      "expectedEffect": "Что должно измениться в AI-ответах через 2-4 недели"
    }
  ],

  "quickWins": [
    {
      "action": "Краткое название задачи",
      "howTo": "Конкретные шаги: зайди на X, сделай Y, скопируй Z. Не абстракции — руководство к действию.",
      "timeEstimate": "45 минут",
      "impact": "Что изменится в выдаче ChatGPT/Perplexity через 2-4 недели"
    }
  ],

  "30d": [
    {
      "title": "Название задачи",
      "description": "Что это и зачем — 1-2 предложения",
      "effort": "low",
      "impact": "high",
      "steps": [
        "Шаг 1: конкретное действие с деталями",
        "Шаг 2: ...",
        "Шаг 3: ..."
      ],
      "expectedResult": "Что изменится в AI-видимости через 30 дней",
      "tools": ["Schema.org", "Google Search Console"],
      "owner": "разработчик"
    }
  ],

  "60d": [...],
  "90d": [...],

  "contentCalendar": [
    { "week": 1, "theme": "Тема контента недели (конкретная, под GEO-запросы)", "tasks": ["Задача 1 с деталями", "Задача 2"] },
    { "week": 2, "theme": "...", "tasks": [...] }
  ]
}

Требования:
- geoTacticsThisWeek: ровно 3 тактики, максимально конкретные под выявленные пробелы, выполнимые за 1-3 дня
- quickWins: ровно 3 задачи, выполнимые за 1-2 дня без разработчика
- 30d: 4-5 задач, фокус на технических GEO-исправлениях (Schema.org, FAQ-контент, Entity signals)
- 60d: 3-4 задачи, фокус на RAG-источниках и авторитете (публикации в СМИ, каталоги, сравнительный контент)
- 90d: 2-3 задачи, фокус на стратегическом Position-росте (партнёрства, Wikipedia, отраслевые рейтинги)
- steps: минимум 3 конкретных шага, не "создайте контент", а "зайдите на schema.org/generator, выберите тип Organization, заполните поля name/url/description"
- contentCalendar: 8 недель, темы ТОЛЬКО из реальных пробелов аудита (не абстрактные), 1-3 задачи в неделю
- Всё строго под нишу "${input.niche}", не общие советы
- На русском языке`

  const { text } = await generateText({ model, prompt, maxOutputTokens: 4000 })

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Growth plan: failed to parse JSON")

  return JSON.parse(jsonMatch[0]) as GrowthPlan
}
