export type Tier = "BASIC" | "STANDARD" | "ADVANCED"

export type RecurringFrequency = "weekly" | "monthly" | "quarterly"

export interface TierConfig {
  queryCount: number
  platforms: string[]
  hasPdf: boolean
  hasActionPlan: boolean
  hasCompetitorMatrix: boolean
  hasPostAuditChat: boolean
  chatMessageLimit: number // 0 = no access, Infinity = unlimited
  hasAnalysisAgent: boolean
  hasContentAgent: boolean
  hasReportRegeneration: boolean
  hasWebsiteFix: boolean // Google Stitch — 1 страница
  hasComparison: boolean // сравнительный анализ с предыдущим аудитом
  hasHistoricalTrends: boolean // график динамики по нескольким аудитам
  hasRagSources: boolean // RAG Source Attribution tab
  recurringFrequencies: RecurringFrequency[] // доступные частоты повторных аудитов
  priorityHours: number // SLA в часах
}

export const TIER_CONFIG: Record<Tier, TierConfig> = {
  BASIC: {
    queryCount: 15,
    platforms: ["CHATGPT", "GEMINI", "YANDEXGPT"],
    hasPdf: false,
    hasActionPlan: false,
    hasCompetitorMatrix: false,
    hasPostAuditChat: false,
    chatMessageLimit: 0,
    hasAnalysisAgent: false,
    hasContentAgent: false,
    hasReportRegeneration: false,
    hasWebsiteFix: false,
    hasComparison: false,
    hasHistoricalTrends: false,
    hasRagSources: false,
    recurringFrequencies: [],
    priorityHours: 48,
  },
  STANDARD: {
    queryCount: 30,
    platforms: ["CHATGPT", "GEMINI", "YANDEXGPT", "CLAUDE", "PERPLEXITY", "DEEPSEEK"],
    hasPdf: true,
    hasActionPlan: true,
    hasCompetitorMatrix: true,
    hasPostAuditChat: true,
    chatMessageLimit: 10,
    hasAnalysisAgent: false,
    hasContentAgent: false,
    hasReportRegeneration: false,
    hasWebsiteFix: false,
    hasComparison: true,
    hasHistoricalTrends: true,
    hasRagSources: true,
    recurringFrequencies: ["monthly", "quarterly"],
    priorityHours: 48,
  },
  ADVANCED: {
    queryCount: 50,
    platforms: ["CHATGPT", "GEMINI", "YANDEXGPT", "CLAUDE", "PERPLEXITY", "DEEPSEEK", "GIGACHAT", "ALISA", "GROK"],
    hasPdf: true,
    hasActionPlan: true,
    hasCompetitorMatrix: true,
    hasPostAuditChat: true,
    chatMessageLimit: Infinity,
    hasAnalysisAgent: true,
    hasContentAgent: true,
    hasReportRegeneration: true,
    hasWebsiteFix: true,
    hasComparison: true,
    hasHistoricalTrends: true,
    hasRagSources: true,
    recurringFrequencies: ["weekly", "monthly", "quarterly"],
    priorityHours: 24,
  },
}

export function getTierConfig(tier: Tier): TierConfig {
  return TIER_CONFIG[tier]
}

export function canUsePdf(tier: Tier) {
  return TIER_CONFIG[tier].hasPdf
}

export function canUsePostAuditChat(tier: Tier) {
  return TIER_CONFIG[tier].hasPostAuditChat
}

export function getChatLimit(tier: Tier) {
  return TIER_CONFIG[tier].chatMessageLimit
}

export function isChatLimitReached(tier: Tier, used: number) {
  const limit = getChatLimit(tier)
  return limit !== Infinity && used >= limit
}

export function getPlatformsForTier(tier: Tier) {
  return TIER_CONFIG[tier].platforms
}

export function getQueryCountForTier(tier: Tier) {
  return TIER_CONFIG[tier].queryCount
}

export function getAvailableFrequencies(tier: Tier): RecurringFrequency[] {
  return TIER_CONFIG[tier].recurringFrequencies
}

export function hasHistoricalTrends(tier: Tier) {
  return TIER_CONFIG[tier].hasHistoricalTrends
}

export function hasRagSources(tier: Tier) {
  return TIER_CONFIG[tier].hasRagSources
}
