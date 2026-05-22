/**
 * monitoring-agent — spot-check AI-видимости бренда без полного аудита.
 *
 * Берёт 5 самых репрезентативных запросов из оригинального аудита,
 * перезапускает их на активных платформах и сравнивает с baseline.
 *
 * Вызывается из:
 * - trigger/monitoring.ts (scheduled cron, еженедельно)
 * - admin API вручную
 */

import { prisma } from "../prisma"
import { AI_CLIENTS } from "../ai-clients"
import { extractMentions } from "../analysis/extract-mentions"

export type AlertLevel = "ok" | "warn" | "critical"

export interface PlatformSpotResult {
  platform: string
  queriesChecked: number
  mentionsBefore: number   // из оригинальных QueryResult
  mentionsNow: number      // из spot-check
  mentionRateBefore: number // 0–1
  mentionRateNow: number
  delta: number            // mentionRateNow - mentionRateBefore (отрицательное = деградация)
}

export interface MonitoringResult {
  jobId: string
  companyName: string
  baselineScore: number
  estimatedCurrentScore: number  // оценка на основе mention rate
  scoreDelta: number
  alertLevel: AlertLevel
  platformResults: PlatformSpotResult[]
  summary: string
  checkedAt: string
}

const SPOT_QUERY_COUNT = 5  // сколько запросов прогоняем на spot-check
const WARN_THRESHOLD = -10  // падение score на 10+ → warn
const CRITICAL_THRESHOLD = -20  // падение на 20+ → critical

export async function runMonitoringAgent(jobId: string): Promise<MonitoringResult> {
  const job = await prisma.auditJob.findUniqueOrThrow({
    where: { id: jobId },
    include: {
      report: true,
      queryResults: {
        orderBy: { createdAt: "asc" },
      },
    },
  })

  if (!job.report) throw new Error(`[monitoring-agent] Нет отчёта для jobId=${jobId}`)

  const baselineScore = job.report.overallScore

  // Выбираем репрезентативные запросы: берём по 1 от каждой платформы,
  // предпочитая запросы где бренд был упомянут (чтобы отследить деградацию)
  const byPlatform = new Map<string, typeof job.queryResults>()
  for (const qr of job.queryResults) {
    const list = byPlatform.get(qr.platform) ?? []
    list.push(qr)
    byPlatform.set(qr.platform, list)
  }

  // Собираем spot-запросы: приоритет — упомянутые, потом любые
  const spotQueries: { query: string; platform: string; wasMentioned: boolean }[] = []
  for (const [platform, results] of byPlatform) {
    if (!AI_CLIENTS[platform]?.isConfigured()) continue
    const mentioned = results.filter((r) => r.brandMentioned)
    const pool = mentioned.length > 0 ? mentioned : results
    // Берём до SPOT_QUERY_COUNT / кол-во платформ запросов на платформу
    const perPlatform = Math.max(1, Math.floor(SPOT_QUERY_COUNT / byPlatform.size))
    for (const r of pool.slice(0, perPlatform)) {
      spotQueries.push({ query: r.query, platform, wasMentioned: r.brandMentioned })
    }
    if (spotQueries.length >= SPOT_QUERY_COUNT) break
  }

  if (spotQueries.length === 0) {
    throw new Error("[monitoring-agent] Нет активных платформ для spot-check")
  }

  // Запускаем spot-check параллельно по платформам
  const spotByPlatform = new Map<string, typeof spotQueries>()
  for (const sq of spotQueries) {
    const list = spotByPlatform.get(sq.platform) ?? []
    list.push(sq)
    spotByPlatform.set(sq.platform, list)
  }

  const platformResults: PlatformSpotResult[] = []
  let totalMentionRateBefore = 0
  let totalMentionRateNow = 0
  let platformCount = 0

  await Promise.allSettled(
    Array.from(spotByPlatform.entries()).map(async ([platform, queries]) => {
      const client = AI_CLIENTS[platform]
      if (!client?.isConfigured()) return

      let mentionsNow = 0
      const mentionsBefore = queries.filter((q) => q.wasMentioned).length

      for (const { query } of queries) {
        try {
          const response = await client.query(query)
          const mentions = extractMentions(response, job.companyName, job.websiteUrl, job.competitors)
          if (mentions.brandMentioned) mentionsNow++
          await sleep(300)
        } catch (err) {
          console.error(`[monitoring-agent] ${platform} error for query:`, err)
        }
      }

      const mentionRateBefore = queries.length > 0 ? mentionsBefore / queries.length : 0
      const mentionRateNow = queries.length > 0 ? mentionsNow / queries.length : 0

      platformResults.push({
        platform,
        queriesChecked: queries.length,
        mentionsBefore,
        mentionsNow,
        mentionRateBefore,
        mentionRateNow,
        delta: mentionRateNow - mentionRateBefore,
      })

      totalMentionRateBefore += mentionRateBefore
      totalMentionRateNow += mentionRateNow
      platformCount++
    })
  )

  // Оцениваем текущий score через изменение mention rate
  const avgDeltaRate =
    platformCount > 0 ? (totalMentionRateNow - totalMentionRateBefore) / platformCount : 0
  const estimatedCurrentScore = Math.max(0, Math.min(100, Math.round(baselineScore + avgDeltaRate * 100)))
  const scoreDelta = estimatedCurrentScore - baselineScore

  const alertLevel: AlertLevel =
    scoreDelta <= CRITICAL_THRESHOLD ? "critical" : scoreDelta <= WARN_THRESHOLD ? "warn" : "ok"

  const worstPlatform = platformResults
    .slice()
    .sort((a, b) => a.delta - b.delta)[0]

  const summary =
    alertLevel === "ok"
      ? `Видимость стабильна. Текущий оценочный score: ${estimatedCurrentScore}/100 (базовый: ${baselineScore}).`
      : alertLevel === "warn"
      ? `Зафиксировано снижение видимости на ~${Math.abs(scoreDelta)} пунктов. Наибольшее падение на платформе ${worstPlatform?.platform ?? "—"}.`
      : `Критическое падение видимости на ~${Math.abs(scoreDelta)} пунктов! Рекомендуется срочный полный аудит.`

  return {
    jobId,
    companyName: job.companyName,
    baselineScore,
    estimatedCurrentScore,
    scoreDelta,
    alertLevel,
    platformResults,
    summary,
    checkedAt: new Date().toISOString(),
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
