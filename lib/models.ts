/**
 * Матрица моделей по тарифам.
 *
 * Принцип:
 * - Диалог (сбор данных) — всегда дешёвая модель, тариф не влияет
 * - Генерация запросов — GPT-4o-mini, достаточно для "придумай 50 вопросов"
 * - Action Plan / анализ — растут с тарифом: mini → Sonnet
 * - Advanced агенты (analysis, content, orchestrator) — только Sonnet
 *
 * Стоимость (вход/выход за 1M токенов):
 *   gemini-2.0-flash       $0.075 / $0.30   — самый дешёвый
 *   gpt-4o-mini            $0.15  / $0.60
 *   claude-haiku-4-5       $0.80  / $4.00
 *   gemini-1.5-pro         $1.25  / $5.00
 *   gpt-4o                 $2.50  / $10.00
 *   claude-sonnet-4-6      $3.00  / $15.00  — только Advanced
 */

import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import type { LanguageModel } from "ai"

type Tier = "BASIC" | "STANDARD" | "ADVANCED"

const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const google    = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
const openai    = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ── Конкретные модели ───────────────────────────────────────────────────────

/** Диалог с клиентом (сбор URL, ниши, email). Все тарифы. */
export const CHAT_MODEL: LanguageModel = google("gemini-2.5-flash")

/**
 * Генерация аудит-запросов. Все тарифы. Схема "2 генератора → фильтр → судья":
 * gpt-4o-mini залипал на few-shot примерах в промпте и штамповал структурно
 * идентичные вопросы в любой нише (см. трекер: "Топ-5 X в России 2026" под
 * копирку для видеоигр и медцентра). Замена на gpt-4o решила эту проблему, но
 * сравнение 6 моделей (admin query-gen-test) показало более глубокий эффект:
 * каждая модель в одиночку видит нишу под одним углом — одни тянут к B2C-
 * вопросам ("посоветуй MMORPG для новичка"), другие к B2B ("нужен паблишер
 * для моей игры") — и не покрывает оба сегмента разом. Два независимых
 * генератора (QUERY_GEN_MODEL + QUERY_GEN_MODEL_B) работают параллельно, их
 * объединённый пул кандидатов проходит детерминированный фильтр (без LLM —
 * самоупоминание бренда и превышение лимита длины надёжнее ловить кодом, чем
 * просить об этом третью модель — так поймали баг Perplexity/Gemini на этих
 * же двух пунктах), затем QUERY_JUDGE_MODEL отбирает финальные N с балансом
 * по сегментам аудитории и категориям намерений. Это один вызов-пара на весь
 * аудит (не на платформу), так что 3x цена этого шага — по-прежнему центы,
 * не влияет на стоимость последующих 6×N вызовов к AI-платформам (тот расход
 * управляется длиной самих вопросов, см. лимит "максимум 16 слов" в промпте).
 */
export const QUERY_GEN_MODEL = "gpt-4o"  // генератор A, используется через openai SDK напрямую
export const QUERY_GEN_MODEL_B = "gemini-2.5-flash"  // генератор B, через @google/generative-ai напрямую
export const QUERY_JUDGE_MODEL = "claude-haiku-4-5-20251001"  // судья, через @anthropic-ai/sdk напрямую

/** Анализ сайта перед чатом (website-analysis-agent). Все тарифы. */
export const WEBSITE_ANALYSIS_MODEL = "gemini-2.5-flash"

/**
 * Модель для генерации Action Plan по тарифу.
 * Basic — плана нет совсем.
 * Standard — GPT-4o-mini, достаточно для структурированного плана.
 * Advanced — Claude Sonnet для максимального качества.
 */
export function getActionPlanModel(tier: Tier): LanguageModel | null {
  if (tier === "BASIC") return null
  if (tier === "STANDARD") return openai("gpt-4o-mini")
  return anthropic("claude-sonnet-4-6")
}

/**
 * Модель для глубокого анализа (analysis-agent, content-agent, report-agent).
 * Доступно только Advanced.
 */
export function getAdvancedAnalysisModel(): LanguageModel {
  return anthropic("claude-sonnet-4-6")
}

/**
 * Модель для оркестратора и website-fix-agent.
 * Только Advanced — нужен лучший reasoning.
 */
export function getOrchestratorModel(): LanguageModel {
  return anthropic("claude-sonnet-4-6")
}

/**
 * Сводная таблица для логирования/отображения в UI.
 */
export const MODEL_MATRIX = {
  BASIC: {
    chat:         "gemini-2.5-flash  ($0.075/1M)",
    queryGen:     "gpt-4o + gemini-2.5-flash → claude-haiku-4-5 (судья)",
    actionPlan:   "— (нет)",
    analysis:     "— (нет)",
    websiteAnalysis: "gemini-2.5-flash ($0.075/1M)",
  },
  STANDARD: {
    chat:         "gemini-2.5-flash  ($0.075/1M)",
    queryGen:     "gpt-4o + gemini-2.5-flash → claude-haiku-4-5 (судья)",
    actionPlan:   "gpt-4o-mini       ($0.15/1M)",
    analysis:     "— (нет)",
    websiteAnalysis: "gemini-2.5-flash ($0.075/1M)",
  },
  ADVANCED: {
    chat:         "gemini-2.5-flash  ($0.075/1M)",
    queryGen:     "gpt-4o + gemini-2.5-flash → claude-haiku-4-5 (судья)",
    actionPlan:   "claude-sonnet-4-6 ($3/1M)",
    analysis:     "claude-sonnet-4-6 ($3/1M)",
    websiteAnalysis: "gemini-2.5-flash ($0.075/1M)",
  },
} as const
