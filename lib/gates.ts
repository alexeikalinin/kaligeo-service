export type Tier = "BASIC" | "STANDARD" | "ADVANCED"

export interface TierConfig {
  queryCount: number
  platforms: string[]
  hasPdf: boolean
  hasActionPlan: boolean
  hasCompetitorMatrix: boolean
  hasPostAuditChat: boolean
  chatMessageLimit: number // 0 = no access, Infinity = unlimited
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
    priorityHours: 48,
  },
  STANDARD: {
    queryCount: 50,
    platforms: ["CHATGPT", "GEMINI", "YANDEXGPT", "CLAUDE", "PERPLEXITY", "DEEPSEEK"],
    hasPdf: true,
    hasActionPlan: true,
    hasCompetitorMatrix: true,
    hasPostAuditChat: true,
    chatMessageLimit: 10,
    priorityHours: 48,
  },
  ADVANCED: {
    queryCount: 150,
    platforms: ["CHATGPT", "GEMINI", "YANDEXGPT", "CLAUDE", "PERPLEXITY", "DEEPSEEK", "GIGACHAT", "ALISA"],
    hasPdf: true,
    hasActionPlan: true,
    hasCompetitorMatrix: true,
    hasPostAuditChat: true,
    chatMessageLimit: Infinity,
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
