import { cachedInternalStep } from "../analysis/stage-cache"
import { EVIDENCE_RULES } from "../analysis/query-methodology"
import { generateText, Output } from "ai"
import { z } from "zod"
import { getAdvancedAnalysisModel } from "../models"
import type { WeakPoint } from "../analysis/weak-points-checker"
import type { PlatformScore } from "../analysis/calculate-scores"
import { runGeoResearchAgent } from "./geo-research-agent"

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
  verifiedEvidence?: unknown
  companyName: string
  niche: string
  websiteUrl: string
  overallScore: number
  weakPoints: WeakPoint[]
  platformScores: Record<string, PlatformScore>
  competitors: string[]
  competitorAnalysis?: string      // результат analysis-agent (competitors)
  gapsAnalysis?: string            // результат analysis-agent (gaps)
  sentimentAnalysis?: string       // результат analysis-agent (sentiment)
  contentRecommendations?: string  // результат content-agent
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

  // Живой поиск актуальных GEO-советов через Perplexity sonar-pro
  // Тихая деградация если API key не задан — plan всё равно генерируется
  const geoResearch = await cachedInternalStep("geo-research",input.platformScores,()=>runGeoResearchAgent(input.platformScores)).catch((err) => {
    console.warn("[growth-plan] geo-research failed, continuing without live tips:", err)
    return null
  })

  // Алиса-специфичный контекст — подключаем когда скор низкий
  const alisaScore = input.platformScores["Alisa"]?.score ?? input.platformScores["alisa"]?.score ?? null
  const alisaBlock = alisaScore !== null && alisaScore < 40
    ? `=== АЛИСА-СПЕЦИФИЧНЫЕ ПРИОРИТЕТЫ ===
Текущий скор Алисы: ${alisaScore}/100. Это наблюдение в нашей выборке, не доказательство технической причины.
Предлагай проверки по фактическим ответам. Карточки локального бизнеса рекомендуй только при релевантности деятельности и после проверки наличия. Не выдумывай инструменты Яндекса, поддержку разметки, требования к рейтингу или гарантии цитирования.`
    : null

  const contextBlocks = [
    alisaBlock,
    geoResearch?.summary && `=== АКТУАЛЬНЫЕ GEO-ДАННЫЕ (живой поиск Perplexity) ===\n${geoResearch.summary}`,
    input.competitorAnalysis  && `=== АНАЛИЗ КОНКУРЕНТОВ ===\n${input.competitorAnalysis}`,
    input.gapsAnalysis        && `=== ПРОБЕЛЫ ВИДИМОСТИ ===\n${input.gapsAnalysis}`,
    input.sentimentAnalysis   && `=== ТОНАЛЬНОСТЬ УПОМИНАНИЙ ===\n${input.sentimentAnalysis}`,
    input.contentRecommendations && `=== КОНТЕНТНЫЕ РЕКОМЕНДАЦИИ ===\n${input.contentRecommendations}`,
  ]
    .filter(Boolean)
    .join("\n\n")

  // Risk gate: data_insufficient — не даём агенту домысливать при нехватке данных
  const totalResults = Object.values(input.platformScores).reduce((sum, s) => sum + s.totalQueries, 0)
  const platformsWithResults = Object.keys(input.platformScores).length
  const dataWarning = totalResults < 5
    ? `\n⚠️ ВНИМАНИЕ: данных аудита мало (${totalResults} запросов). Если для какого-либо вывода не хватает данных — явно напиши INSUFFICIENT_DATA:[причина] вместо домысла.\n`
    : ""

  // Risk gate: geo_visibility_claim — оговорка при неполном покрытии платформ
  const selectedPlatformsCount = Object.keys(input.platformScores).length
  const coverageWarning = selectedPlatformsCount > 0 && platformsWithResults < selectedPlatformsCount / 2
    ? `\n⚠️ ЧАСТИЧНЫЙ АНАЛИЗ: данные получены только по ${platformsWithResults} из ${selectedPlatformsCount} платформ. В стратегии обязательно укажи: «Анализ частичный — данные по ${platformsWithResults} платформам из ${selectedPlatformsCount} выбранных». Не используй формулировки «вы видны на всех платформах» или аналогичные.\n`
    : ""

  const prompt = `${EVIDENCE_RULES}
Проверки сайта: ${JSON.stringify(input.verifiedEvidence ?? "Не проверено")}. Не предлагай создать уже найденную статью Wikipedia.
Ты — старший консультант по GEO (Generative Engine Optimization) 2026. Твоя задача — создать детальный план роста AI-видимости, который команда клиента сможет выполнить самостоятельно.
${dataWarning}${coverageWarning}
Контекст: выводы относятся к собранным ответам и указанным режимам моделей. Причины ранжирования, будущие клики и эффекты рекомендаций не измерены; оформляй их как проверяемые гипотезы.

Рекомендации по платформам выводи из наблюдаемых ответов и проверенных источников. Не используй универсальные списки обязательных каталогов, неподтверждённые проценты источников, правила рейтинга отзывов или гарантии цитирования. Низкий score не устанавливает причину. Экспериментальные форматы помечай как гипотезы.

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
      "expectedEffect": "Гипотеза эффекта и способ проверки в следующем замере"
    }
  ],

  "quickWins": [
    {
      "action": "Краткое название задачи",
      "howTo": "Конкретные шаги: зайди на X, сделай Y, скопируй Z. Не абстракции — руководство к действию.",
      "timeEstimate": "45 минут",
      "impact": "Проверяемая гипотеза эффекта без гарантии результата"
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
      "expectedResult": "Критерий выполнения и способ измерения эффекта",
      "tools": ["Применимые инструменты; без выдуманных адресов"],
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
- steps: минимум 3 конкретных шага, используй проверенные данные и конкретные поля; не выдумывай адреса инструментов
- contentCalendar: 8 недель, темы ТОЛЬКО из реальных пробелов аудита (не абстрактные), 1-3 задачи в неделю
- Всё строго под нишу "${input.niche}", не общие советы
- На русском языке`

  const action = z.object({
    title: z.string(), description: z.string(), effort: z.enum(["low", "medium", "high"]), impact: z.enum(["low", "medium", "high"]),
    steps: z.array(z.string()), expectedResult: z.string(), tools: z.array(z.string()), owner: z.string(),
  })
  const metadataSchema = z.object({
    strategy: z.string(),
    quickWins: z.array(z.object({ action: z.string(), howTo: z.string(), timeEstimate: z.string(), impact: z.string() })),
    contentCalendar: z.array(z.object({ week: z.number(), theme: z.string(), tasks: z.array(z.string()) })),
    geoTacticsThisWeek: z.array(z.object({ tactic: z.string(), why: z.string(), expectedEffect: z.string() })),
  })
  const concise = "Все формулировки краткие: описание задачи до 30 слов, каждый шаг до 15 слов, ожидаемый эффект до 15 слов. Не повторяй исходный аудит."
  const [metadata, ...periods] = await Promise.all([
    cachedInternalStep("metadata",prompt,async()=> (await generateText({ maxRetries: 0, model, prompt: `${prompt}\nСейчас верни ТОЛЬКО strategy, quickWins, contentCalendar, geoTacticsThisWeek. Периоды 30d/60d/90d генерируются отдельно. ${concise}`,
      maxOutputTokens: 6000, output: Output.object({ schema: metadataSchema }),
    })).output),
    ...(["30d", "60d", "90d"] as const).map(period => cachedInternalStep(period,prompt,async()=> (await generateText({ maxRetries: 0,
      model, prompt: `${prompt}\nСейчас подготовь ТОЛЬКО задачи периода ${period}. Верни объект {"items": [...]} с 3-4 задачами. Не включай стратегию, календарь и другие периоды. ${concise}`,
      maxOutputTokens: 5000, output: Output.object({ schema: z.object({ items: z.array(action).min(1) }) }),
    })).output)),
  ])
  return { ...metadata, "30d": periods[0].items, "60d": periods[1].items, "90d": periods[2].items }
}
