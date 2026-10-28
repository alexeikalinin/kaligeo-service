import { prisma } from "../prisma"

const PLATFORMS = ["CHATGPT", "CLAUDE", "GEMINI", "PERPLEXITY", "DEEPSEEK", "YANDEXGPT", "GIGACHAT", "ALISA", "GROK"]

export type PlatformRisk = "ok" | "warn" | "blocked"

export interface PlatformStatus {
  platform: string
  usedToday: number
  dailyLimit: number | null
  usagePct: number | null
  risk: PlatformRisk
}

export interface RiskReport {
  canStartAudit: boolean
  blockedPlatforms: string[]
  warnPlatforms: string[]
  queueDepth: number
  platformStatuses: PlatformStatus[]
  recommendation: string
  riskLevel: "low" | "medium" | "high" | "critical"
}

export async function runRiskAgent(requestedPlatforms?: string[]): Promise<RiskReport> {
  const platforms = [...new Set(requestedPlatforms ?? PLATFORMS)]
  const dayStart = new Date()
  dayStart.setUTCHours(0, 0, 0, 0)
  const [usageRows, activeJobs] = await Promise.all([
    prisma.queryResult.groupBy({
      by: ["platform"],
      where: { createdAt: { gte: dayStart } },
      _count: { id: true },
    }),
    prisma.auditJob.count({
      where: { status: { in: ["PENDING", "GENERATING_QUERIES", "EXECUTING_QUERIES", "ANALYZING", "GENERATING_REPORT"] } },
    }),
  ])
  const usageMap = Object.fromEntries(usageRows.map(r => [r.platform, r._count.id]))
  // Usage remains observable. Internal daily quotas no longer exclude platforms;
  // actual provider failures are recorded by the query execution layer.
  return {
    canStartAudit: platforms.length > 0,
    blockedPlatforms: [],
    warnPlatforms: [],
    queueDepth: activeJobs,
    platformStatuses: platforms.map(platform => ({
      platform, usedToday: usageMap[platform] ?? 0,
      dailyLimit: null, usagePct: null, risk: "ok",
    })),
    recommendation: platforms.length === 0
      ? "Нет доступных платформ для запуска аудита."
      : `Внутренние дневные лимиты отключены. В работе: ${activeJobs} аудитов.${activeJobs > 5 ? " Возможны задержки из-за очереди." : ""}`,
    riskLevel: activeJobs > 10 ? "critical" : activeJobs > 5 ? "high" : activeJobs > 3 ? "medium" : "low",
  }
}

/** Compatibility entry point: no platform is dropped because of internal usage counts. */
export async function assertCanStartAudit(platforms: string[]): Promise<{
  platformsToUse: string[]
  skippedPlatforms: string[]
  warnings: string[]
}> {
  if (platforms.length === 0) throw new Error("Нет доступных платформ для запуска аудита")
  return { platformsToUse: [...new Set(platforms)], skippedPlatforms: [], warnings: [] }
}
