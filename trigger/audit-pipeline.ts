import { task } from "@trigger.dev/sdk/v3"
import { prisma } from "../lib/prisma"
import { executeQueriesOnPlatform } from "./steps/execute-queries"
import { generateQueries } from "./steps/generate-queries"
import { renderAndUploadPdf } from "./steps/render-pdf"
import { sendReportEmail, sendFollowUpEmail } from "./steps/deliver"
import { calculateVisibilityScores, calculateOverallScore } from "../lib/analysis/calculate-scores"
import { buildCompetitorMatrix } from "../lib/analysis/competitor-matrix"
import { detectWeakPoints } from "../lib/analysis/weak-points-checker"
import { generateActionPlan } from "../lib/report/action-plan-gen"
import { runGrowthPlanAgent } from "../lib/agents/growth-plan-agent"
import { runAnalysisAgent } from "../lib/agents/analysis-agent"
import { runContentAgent } from "../lib/agents/content-agent"
import { getTierConfig, type Tier } from "../lib/gates"
import { assertCanStartAudit } from "../lib/agents/risk-agent"
import { getActivePlatforms } from "../lib/ai-clients"
import { notifyAuditCompleted, notifyAuditFailed } from "../lib/notify"

export interface AuditPayload {
  jobId: string
}

export const auditPipeline = task({
  id: "audit-pipeline",
  maxDuration: 3600,
  retry: { maxAttempts: 2 },

  run: async (payload: AuditPayload) => {
    const { jobId } = payload

    const job = await prisma.auditJob.findUniqueOrThrow({ where: { id: jobId } })

    try {
      return await runPipeline(job)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      await prisma.auditJob.update({
        where: { id: jobId },
        data: { status: "FAILED", errorMessage },
      })
      notifyAuditFailed({
        companyName: job.companyName,
        tier: job.tier,
        jobId,
        errorMessage,
      }).catch(console.error)
      throw err
    }
  },
})

async function runPipeline(job: Awaited<ReturnType<typeof prisma.auditJob.findUniqueOrThrow>>) {
    const jobId = job.id
    const config = getTierConfig(job.tier as Tier)
    const isAdvanced = job.tier === "ADVANCED"

    // ── Step 1: Generate queries ──────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "GENERATING_QUERIES" } })

    const queries = await generateQueries(job.companyName, job.niche, job.competitors, job.tier)

    // ── Step 2: Execute queries — only platforms for this tier ────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "EXECUTING_QUERIES" } })

    // Пересекаем тарифные платформы с теми у которых есть ключи
    const activePlatforms = getActivePlatforms()
    const basePlatforms = job.selectedPlatforms.length > 0 ? job.selectedPlatforms : config.platforms
    const tierPlatforms = basePlatforms.filter((p) => activePlatforms.includes(p))
    const suspendedByKey = config.platforms.filter((p) => !activePlatforms.includes(p))
    if (suspendedByKey.length > 0) {
      console.warn(`[platforms] Приостановлены (нет ключей): ${suspendedByKey.join(", ")}`)
    }

    const { platformsToUse, skippedPlatforms } = await assertCanStartAudit(tierPlatforms)
    if (skippedPlatforms.length > 0) {
      console.warn(`[risk-agent] Пропущены из-за лимитов: ${skippedPlatforms.join(", ")}`)
    }

    await Promise.allSettled(
      platformsToUse.map((platform) =>
        executeQueriesOnPlatform(jobId, queries, platform, job.companyName, job.websiteUrl, job.competitors)
      )
    )

    // ── Step 3: Analysis ──────────────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "ANALYZING" } })

    const allResults = await prisma.queryResult.findMany({ where: { jobId } })

    const platformScores = calculateVisibilityScores(allResults)
    const overallScore = calculateOverallScore(platformScores)
    const competitorMatrix = config.hasCompetitorMatrix
      ? buildCompetitorMatrix(allResults, job.competitors)
      : []
    const weakPoints = detectWeakPoints(allResults, job.websiteUrl, overallScore)

    // ── Step 4: Advanced — параллельный запуск агентов анализа ───────────
    let competitorAnalysis: string | undefined
    let gapsAnalysis: string | undefined
    let contentRecommendations: string | undefined

    if (isAdvanced) {
      const [compAnalysis, gaps, contentRecs] = await Promise.allSettled([
        runAnalysisAgent(jobId, "competitors"),
        runAnalysisAgent(jobId, "gaps"),
        runContentAgent({
          companyName: job.companyName,
          niche: job.niche,
          weakPoints: weakPoints.filter((w) => w.detected).map((w) => w.title),
          competitorStrengths: [],
        }).then((r) => JSON.stringify(r, null, 2)),
      ])

      competitorAnalysis = compAnalysis.status === "fulfilled" ? compAnalysis.value : undefined
      gapsAnalysis       = gaps.status === "fulfilled"         ? gaps.value        : undefined
      contentRecommendations = contentRecs.status === "fulfilled" ? contentRecs.value : undefined
    }

    // ── Step 5: Action Plan / Growth Plan ─────────────────────────────────
    let actionPlan: object = { "30d": [], "60d": [], "90d": [] }

    if (config.hasActionPlan) {
      if (isAdvanced) {
        // Advanced: детальный план внедрения с конкретными шагами
        actionPlan = await runGrowthPlanAgent({
          companyName: job.companyName,
          niche: job.niche,
          websiteUrl: job.websiteUrl,
          overallScore,
          weakPoints,
          platformScores,
          competitors: job.competitors,
          competitorAnalysis,
          gapsAnalysis,
          contentRecommendations,
        })
      } else {
        // Standard: базовый план (GPT-4o-mini)
        actionPlan = await generateActionPlan(
          job.companyName, job.niche, weakPoints, platformScores, overallScore,
          job.tier as "BASIC" | "STANDARD" | "ADVANCED"
        )
      }
    }

    await prisma.report.create({
      data: {
        jobId,
        visibilityScores: platformScores as any,
        competitorMatrix:  competitorMatrix as any,
        weakPoints:        weakPoints as any,
        actionPlan:        actionPlan as any,
        overallScore,
      },
    })

    // ── Step 6: PDF (Standard+) ───────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "GENERATING_REPORT" } })

    let pdfUrl: string | undefined
    if (config.hasPdf) {
      pdfUrl = await renderAndUploadPdf(jobId)
      await prisma.auditJob.update({ where: { id: jobId }, data: { pdfUrl } })
    }

    // ── Step 7: Email delivery ────────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "DELIVERING" } })

    const reportUrl = `${process.env.NEXT_PUBLIC_APP_URL}/report/${jobId}?token=${job.reportToken}`

    if (job.baselineJobId) {
      const baselineReport = await prisma.report.findUnique({ where: { jobId: job.baselineJobId } })
      await sendFollowUpEmail({
        to: job.clientEmail,
        companyName: job.companyName,
        overallScore,
        baselineScore: baselineReport?.overallScore ?? 0,
        reportUrl,
        pdfUrl,
      })
    } else {
      await sendReportEmail({
        to: job.clientEmail,
        companyName: job.companyName,
        overallScore,
        reportUrl,
        pdfUrl: pdfUrl ?? "",
      })
    }

    // ── Done ──────────────────────────────────────────────────────────────
    await prisma.auditJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date() },
    })

    notifyAuditCompleted({
      companyName: job.companyName,
      clientEmail: job.clientEmail,
      tier: job.tier,
      overallScore,
      reportUrl,
      jobId,
      isFollowUp: !!job.baselineJobId,
    }).catch(console.error)

    return { jobId, overallScore, pdfUrl }
}
