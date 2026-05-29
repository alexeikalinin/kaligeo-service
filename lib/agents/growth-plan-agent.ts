import { generateText } from "ai"
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
  const geoResearch = await runGeoResearchAgent(input.platformScores).catch((err) => {
    console.warn("[growth-plan] geo-research failed, continuing without live tips:", err)
    return null
  })

  // Алиса-специфичный контекст — подключаем когда скор низкий
  const alisaScore = input.platformScores["Alisa"]?.score ?? input.platformScores["alisa"]?.score ?? null
  const alisaBlock = alisaScore !== null && alisaScore < 40
    ? `=== АЛИСА-СПЕЦИФИЧНЫЕ ПРИОРИТЕТЫ ===
Алиса работает иначе, чем ChatGPT/Perplexity — она опирается на экосистему Яндекса.
Текущий скор Алисы: ${alisaScore}/100. Обязательные Алиса-рекомендации:

1. Яндекс Бизнес (business.yandex.ru): зарегистрировать/полностью заполнить карточку — это primary source для голосовых рекомендаций Алисы.
2. Speakable Schema.org: разметить ключевые абзацы (H1, первый параграф описания, FAQ-ответы) через speakableSpecification — единственная разметка специально под голос.
3. FAQ-страница: 10–15 вопросов с ответами ≤60 слов + разметка FAQPage — именно такой контент Алиса цитирует дословно.
4. Отзывы на Яндекс Картах: минимум 10 свежих отзывов с рейтингом 4.5+. Алиса учитывает тональность отзывов при рекомендациях.
5. YandexAdditionalBot в robots.txt: убедиться, что краулер Алисы не заблокирован.
6. llms.txt: добавить в корень сайта файл разрешений для AI-краулеров (аналог robots.txt для LLM).
7. Яндекс Вебмастер: подключить инструмент "AI-видимость с Алисой" для мониторинга по каким запросам Алиса вас цитирует.`
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
  const totalMentions = Object.values(input.platformScores).reduce((sum, s) => sum + s.mentionCount, 0)
  const platformsWithResults = Object.keys(input.platformScores).length
  const dataWarning = totalResults < 5
    ? `\n⚠️ ВНИМАНИЕ: данных аудита мало (${totalResults} запросов). Если для какого-либо вывода не хватает данных — явно напиши INSUFFICIENT_DATA:[причина] вместо домысла.\n`
    : ""

  // Risk gate: geo_visibility_claim — оговорка при неполном покрытии платформ
  const selectedPlatformsCount = Object.keys(input.platformScores).length
  const coverageWarning = selectedPlatformsCount > 0 && platformsWithResults < selectedPlatformsCount / 2
    ? `\n⚠️ ЧАСТИЧНЫЙ АНАЛИЗ: данные получены только по ${platformsWithResults} из ${selectedPlatformsCount} платформ. В стратегии обязательно укажи: «Анализ частичный — данные по ${platformsWithResults} платформам из ${selectedPlatformsCount} выбранных». Не используй формулировки «вы видны на всех платформах» или аналогичные.\n`
    : ""

  const prompt = `Ты — старший консультант по GEO (Generative Engine Optimization) 2026. Твоя задача — создать детальный план роста AI-видимости, который команда клиента сможет выполнить самостоятельно.
${dataWarning}${coverageWarning}
Контекст GEO 2026: ChatGPT, Perplexity, Gemini, Claude, Яндекс Алиса используют RAG-системы — они извлекают информацию из авторитетных источников и ранжируют бренды на основе Entity Recognition, E-E-A-T сигналов и частоты цитирования в авторитетных источниках. Бренд, упоминаемый первым в ответе ИИ, имеет в 3-5 раз больше кликов, чем упомянутый вторым.

МАТРИЦА ЦИТИРУЮЩИХ СИГНАЛОВ ПО ПЛАТФОРМАМ (для каждой платформы с низким score — рекомендации КОНКРЕТНО под её сигналы):
- ChatGPT    → прямой ответ в первом абзаце + плотность ссылок + конкретные цифры (статистика, даты)
- Perplexity → оригинальные данные + методология исследования + Reddit-присутствие (46.7% источников)
- Claude     → прозрачность рассуждений + evidence-to-claim маппинг + Brave Search видимость (86.7% источников)
- Gemini     → YouTube-контент + Google Business Profile + Article schema с dateModified
- Алиса      → Яндекс Бизнес + Speakable Schema + FAQPage ≤60 слов + отзывы Яндекс Карты 4.5+
- GigaChat   → публикации в деловых СМИ (РБК, Ведомости, Коммерсантъ) + GigaSearch
- YandexGPT  → Яндекс Дзен + Q&A (Яндекс Кью) + Яндекс Вебмастер
- Grok       → X/Twitter-присутствие + разрешение xAI-краулера в robots.txt
- DeepSeek   → техническая глубина + GitHub/Stack Overflow + академические источники

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
      "tools": ["Schema.org", "Google Search Console", "Яндекс Вебмастер", "llms.txt"],
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
