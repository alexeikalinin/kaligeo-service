import { prisma } from "../prisma"

// Порог (% от дневного лимита) при котором платформа считается перегруженной
const RISK_THRESHOLD_WARN = 0.70   // 70% — предупреждение
const RISK_THRESHOLD_BLOCK = 0.90  // 90% — блокировка новых аудитов на этой платформе

const DAILY_LIMITS: Record<string, number> = {
  CHATGPT:    Number(process.env.LIMIT_CHATGPT)    || 200,
  CLAUDE:     Number(process.env.LIMIT_CLAUDE)     || 200,
  GEMINI:     Number(process.env.LIMIT_GEMINI)     || 300,
  PERPLEXITY: Number(process.env.LIMIT_PERPLEXITY) || 100,
  DEEPSEEK:   Number(process.env.LIMIT_DEEPSEEK)   || 200,
  YANDEXGPT:  Number(process.env.LIMIT_YANDEXGPT)  || 200,
  GIGACHAT:   Number(process.env.LIMIT_GIGACHAT)   || 100,
  ALISA:      Number(process.env.LIMIT_ALISA)      || 100,
}

export type PlatformRisk = "ok" | "warn" | "blocked"

export interface PlatformStatus {
  platform: string
  usedToday: number
  dailyLimit: number
  usagePct: number
  risk: PlatformRisk
}

export interface RiskReport {
  canStartAudit: boolean
  blockedPlatforms: string[]   // платформы которые нельзя использовать
  warnPlatforms: string[]      // платформы с предупреждением
  queueDepth: number           // сколько аудитов сейчас в работе
  platformStatuses: PlatformStatus[]
  recommendation: string       // человекочитаемая рекомендация
  riskLevel: "low" | "medium" | "high" | "critical"
}

function startOfDay(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

export async function runRiskAgent(
  requestedPlatforms?: string[]
): Promise<RiskReport> {
  const platforms = requestedPlatforms ?? Object.keys(DAILY_LIMITS)

  const [usageRows, activeJobs] = await Promise.all([
    prisma.queryResult.groupBy({
      by: ["platform"],
      where: { createdAt: { gte: startOfDay() } },
      _count: { id: true },
    }),
    prisma.auditJob.count({
      where: {
        status: {
          in: ["PENDING", "GENERATING_QUERIES", "EXECUTING_QUERIES", "ANALYZING", "GENERATING_REPORT"],
        },
      },
    }),
  ])

  const usageMap = Object.fromEntries(
    usageRows.map((r) => [r.platform, r._count.id])
  )

  const platformStatuses: PlatformStatus[] = platforms.map((platform) => {
    const usedToday = usageMap[platform] ?? 0
    const dailyLimit = DAILY_LIMITS[platform] ?? 100
    const usagePct = usedToday / dailyLimit
    const risk: PlatformRisk =
      usagePct >= RISK_THRESHOLD_BLOCK ? "blocked" :
      usagePct >= RISK_THRESHOLD_WARN  ? "warn"    : "ok"
    return { platform, usedToday, dailyLimit, usagePct, risk }
  })

  const blocked = platformStatuses.filter((p) => p.risk === "blocked").map((p) => p.platform)
  const warned  = platformStatuses.filter((p) => p.risk === "warn").map((p) => p.platform)

  // Аудит невозможен если ВСЕ запрошенные платформы заблокированы
  const availablePlatforms = platforms.filter((p) => !blocked.includes(p))
  const canStartAudit = availablePlatforms.length > 0

  // Очередь: если >5 активных аудитов — повышаем риск
  const queueRisk = activeJobs > 10 ? "critical" : activeJobs > 5 ? "high" : "low"

  let riskLevel: RiskReport["riskLevel"]
  if (!canStartAudit || queueRisk === "critical") {
    riskLevel = "critical"
  } else if (blocked.length > 2 || queueRisk === "high") {
    riskLevel = "high"
  } else if (warned.length > 0 || activeJobs > 3) {
    riskLevel = "medium"
  } else {
    riskLevel = "low"
  }

  const recommendation = buildRecommendation({
    canStartAudit,
    blocked,
    warned,
    activeJobs,
    availablePlatforms,
    riskLevel,
  })

  return {
    canStartAudit,
    blockedPlatforms: blocked,
    warnPlatforms: warned,
    queueDepth: activeJobs,
    platformStatuses,
    recommendation,
    riskLevel,
  }
}

function buildRecommendation(params: {
  canStartAudit: boolean
  blocked: string[]
  warned: string[]
  activeJobs: number
  availablePlatforms: string[]
  riskLevel: string
}): string {
  const { canStartAudit, blocked, warned, activeJobs, availablePlatforms, riskLevel } = params

  if (!canStartAudit) {
    return `Все платформы исчерпали дневной лимит запросов. Новые аудиты невозможны до 00:00 UTC. Увеличь лимиты через env LIMIT_* или апгрейд API-план.`
  }

  const parts: string[] = []

  if (blocked.length > 0) {
    parts.push(`Платформы ${blocked.join(", ")} заблокированы (>90% дневного лимита) — они будут исключены из новых аудитов.`)
  }

  if (warned.length > 0) {
    parts.push(`Платформы ${warned.join(", ")} приближаются к лимиту (>70%) — могут стать недоступны до конца дня.`)
  }

  if (activeJobs > 5) {
    parts.push(`В очереди ${activeJobs} активных аудитов — возможны задержки. Рекомендуется отложить запуск новых.`)
  }

  if (parts.length === 0) {
    return `Всё в норме. Доступны платформы: ${availablePlatforms.join(", ")}. Очередь: ${activeJobs} аудитов.`
  }

  if (riskLevel === "critical" || riskLevel === "high") {
    parts.push(`Действие: проверь /admin/usage, при необходимости подними LIMIT_* в env или подожди сброса счётчиков в 00:00 UTC.`)
  }

  return parts.join(" ")
}

/**
 * Быстрая проверка перед стартом аудита — можно ли запустить на конкретных платформах.
 * Бросает ошибку если риск критический.
 */
export async function assertCanStartAudit(platforms: string[]): Promise<{
  platformsToUse: string[]
  skippedPlatforms: string[]
  warnings: string[]
}> {
  const report = await runRiskAgent(platforms)

  if (!report.canStartAudit) {
    throw new Error(
      `Аудит невозможен: ${report.recommendation}`
    )
  }

  const platformsToUse = platforms.filter(
    (p) => !report.blockedPlatforms.includes(p)
  )
  const skippedPlatforms = report.blockedPlatforms.filter((p) => platforms.includes(p))
  const warnings = report.warnPlatforms
    .filter((p) => platforms.includes(p))
    .map((p) => {
      const status = report.platformStatuses.find((s) => s.platform === p)
      return `${p}: ${Math.round((status?.usagePct ?? 0) * 100)}% дневного лимита использовано`
    })

  return { platformsToUse, skippedPlatforms, warnings }
}
