import { internalUsageMiddleware } from "./analysis/internal-usage"
/** Internal report models are separate from the AI platforms being measured. */
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createOpenAI } from "@ai-sdk/openai"
import { defaultSettingsMiddleware, wrapLanguageModel, type LanguageModel } from "ai"

type Tier = "BASIC" | "STANDARD" | "ADVANCED"
const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY })
const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
export const INTERNAL_FLASH_MODEL = "gemini-2.5-flash"
export const INTERNAL_LITE_MODEL = "gemini-3.1-flash-lite"
export const INTERNAL_MODEL_VERSION = "gemini-internal-v1"

function internalModel(lite = false) {
  return wrapLanguageModel({
    model: google(lite ? INTERNAL_LITE_MODEL : INTERNAL_FLASH_MODEL),
    middleware: [internalUsageMiddleware, defaultSettingsMiddleware({ settings: {
      // Total output is bounded by each caller; no unbounded dynamic thinking.
      providerOptions: { google: { thinkingConfig: lite ? { thinkingLevel: "minimal" } : { thinkingBudget: 1024 } } },
    } })],
  })
}
export function getQueryGeneratorModel(): LanguageModel { return wrapLanguageModel({model:openai(QUERY_GEN_MODEL),middleware:internalUsageMiddleware}) }
export const CHAT_MODEL: LanguageModel = internalModel(true)
// Preserve the two independent query generators; replace only the Anthropic judge.
export const QUERY_GEN_MODEL = "gpt-4o"
export const QUERY_GEN_MODEL_B = INTERNAL_FLASH_MODEL
export const QUERY_JUDGE_MODEL = INTERNAL_FLASH_MODEL
export const WEBSITE_ANALYSIS_MODEL = INTERNAL_FLASH_MODEL
export function getLightweightModel(): LanguageModel { return internalModel(true) }
export function getAdvancedAnalysisModel(): LanguageModel { return internalModel() }
export function getOrchestratorModel(): LanguageModel { return internalModel() }
export function getActionPlanModel(tier: Tier): LanguageModel | null {
  if (tier === "BASIC") return null
  if (tier === "STANDARD") return wrapLanguageModel({model:openai("gpt-4o-mini"),middleware:internalUsageMiddleware})
  return internalModel()
}
const common = {
  chat: INTERNAL_LITE_MODEL,
  queryGen: `${QUERY_GEN_MODEL} + ${QUERY_GEN_MODEL_B} → ${QUERY_JUDGE_MODEL} (судья)`,
  websiteAnalysis: WEBSITE_ANALYSIS_MODEL,
}
export const MODEL_MATRIX = {
  BASIC: { ...common, actionPlan: "— (нет)", analysis: "— (нет)" },
  STANDARD: { ...common, actionPlan: "gpt-4o-mini", analysis: "— (нет)" },
  ADVANCED: { ...common, actionPlan: INTERNAL_FLASH_MODEL, analysis: INTERNAL_FLASH_MODEL },
} as const
