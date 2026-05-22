export type Tier = "BASIC" | "STANDARD" | "ADVANCED"
  | "MONITOR_START" | "MONITOR_PRO" | "MONITOR_AGENT"

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
  hasShareOfVoice: boolean // SoV & Competitive Positioning вкладка
  hasBenchmark: boolean // сравнение score с медианой по нише (benchmark-agent)
  hasMonitoringAlerts: boolean // spot-check + email-алерты при падении (monitoring-agent)
  recurringFrequencies: RecurringFrequency[] // доступные частоты повторных аудитов
  priorityHours: number // SLA в часах
  isSubscription: boolean // подписочная модель (авто-повторные аудиты)
  priceRub: number | null // цена в рублях (null = кастомный/enterprise)
  priceLabel: string // отображаемая цена
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
    hasShareOfVoice: false,
    hasBenchmark: false,          // нет истории для сравнения на базовом
    hasMonitoringAlerts: true,    // алерты доступны всем разовым
    recurringFrequencies: [],
    priorityHours: 48,
    isSubscription: false,
    priceRub: 4900,
    priceLabel: "4 900 ₽",
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
    hasShareOfVoice: true,
    hasBenchmark: true,           // STANDARD+ получают перцентиль по нише
    hasMonitoringAlerts: true,
    recurringFrequencies: ["monthly", "quarterly"],
    priorityHours: 48,
    isSubscription: false,
    priceRub: 13900,
    priceLabel: "13 900 ₽",
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
    hasShareOfVoice: true,
    hasBenchmark: true,
    hasMonitoringAlerts: true,
    recurringFrequencies: ["weekly", "monthly", "quarterly"],
    priorityHours: 24,
    isSubscription: false,
    priceRub: 27900,
    priceLabel: "27 900 ₽",
  },
  // ── Подписочные тарифы (мониторинг) ──────────────────────────────────────────
  MONITOR_START: {
    // = BASIC-уровень, но периодический. Те же 3 платформы, без PDF.
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
    hasComparison: true,          // delta к прошлому аудиту — ключевая ценность подписки
    hasHistoricalTrends: true,
    hasRagSources: false,
    hasShareOfVoice: false,
    hasBenchmark: false,          // как BASIC — без нишевого бенчмарка
    hasMonitoringAlerts: true,    // spot-check + email-алерты — ядро подписки
    recurringFrequencies: ["monthly"],
    priorityHours: 48,
    isSubscription: true,
    priceRub: 4990,
    priceLabel: "4 990 ₽/мес",
  },
  MONITOR_PRO: {
    // = STANDARD-уровень, но периодический. 6 платформ, PDF, план.
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
    hasShareOfVoice: true,
    hasBenchmark: true,           // как STANDARD — нишевый бенчмарк включён
    hasMonitoringAlerts: true,
    recurringFrequencies: ["monthly"],
    priorityHours: 48,
    isSubscription: true,
    priceRub: 9990,
    priceLabel: "9 990 ₽/мес",
  },
  MONITOR_AGENT: {
    // = ADVANCED-уровень, но периодический. Все 9 платформ + все AI-агенты.
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
    hasShareOfVoice: true,
    hasBenchmark: true,
    hasMonitoringAlerts: true,
    recurringFrequencies: ["weekly", "monthly"],
    priorityHours: 24,
    isSubscription: true,
    priceRub: 19990,
    priceLabel: "19 990 ₽/мес",
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

export function hasShareOfVoice(tier: Tier) {
  return TIER_CONFIG[tier].hasShareOfVoice
}

export function isSubscriptionTier(tier: Tier) {
  return TIER_CONFIG[tier].isSubscription
}

export function getTierPrice(tier: Tier): string {
  return TIER_CONFIG[tier].priceLabel
}

/** Возвращает базовый тир для подписочных (для пайплайна) */
export function getBaseTier(tier: Tier): "BASIC" | "STANDARD" | "ADVANCED" {
  if (tier === "MONITOR_START") return "BASIC"
  if (tier === "MONITOR_PRO") return "STANDARD"
  if (tier === "MONITOR_AGENT") return "ADVANCED"
  return tier
}

/** Все тиры, которые имеют доступ к уровню STANDARD или выше */
export function isStandardOrAbove(tier: Tier) {
  return ["STANDARD", "ADVANCED", "MONITOR_PRO", "MONITOR_AGENT"].includes(tier)
}

/** Все тиры, которые имеют доступ к уровню ADVANCED */
export function isAdvancedOrAbove(tier: Tier) {
  return ["ADVANCED", "MONITOR_AGENT"].includes(tier)
}

/** Нишевый бенчмарк (сравнение score с медианой по нише) */
export function hasBenchmark(tier: Tier) {
  return TIER_CONFIG[tier].hasBenchmark
}

/** Мониторинг-алерты: spot-check + email при падении видимости */
export function hasMonitoringAlerts(tier: Tier) {
  return TIER_CONFIG[tier].hasMonitoringAlerts
}
