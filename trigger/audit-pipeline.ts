import { task } from "@trigger.dev/sdk/v3"
import { prisma } from "../lib/prisma"
import { executeQueriesOnPlatform } from "./steps/execute-queries"
import { generateQueries } from "./steps/generate-queries"
import { renderAndUploadPdf } from "./steps/render-pdf"
import { sendReportEmail } from "./steps/deliver"
import { calculateVisibilityScores, calculateOverallScore } from "../lib/analysis/calculate-scores"
import { buildCompetitorMatrix } from "../lib/analysis/competitor-matrix"
import { detectWeakPoints } from "../lib/analysis/weak-points-checker"
import { generateActionPlan } from "../lib/report/action-plan-gen"
import { getTierConfig, type Tier } from "../lib/gates"

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
    const config = getTierConfig(job.tier as Tier)

    // ── Step 1: Generate queries ──────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "GENERATING_QUERIES" } })

    const queries = await generateQueries(job.companyName, job.niche, job.competitors, job.tier)

    // ── Step 2: Execute queries — only platforms for this tier ────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "EXECUTING_QUERIES" } })

    await Promise.allSettled(
      config.platforms.map((platform) =>
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

    // ── Step 4: Action plan (Standard+) ──────────────────────────────────
    const actionPlan = config.hasActionPlan
      ? await generateActionPlan(job.companyName, job.niche, weakPoints, platformScores, overallScore)
      : { "30d": [], "60d": [], "90d": [] }

    await prisma.report.create({
      data: {
        jobId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        visibilityScores: platformScores as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        competitorMatrix: competitorMatrix as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        weakPoints: weakPoints as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        actionPlan: actionPlan as any,
        overallScore,
      },
    })

    // ── Step 5: PDF (Standard+) ───────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "GENERATING_REPORT" } })

    let pdfUrl: string | undefined
    if (config.hasPdf) {
      pdfUrl = await renderAndUploadPdf(jobId)
      await prisma.auditJob.update({ where: { id: jobId }, data: { pdfUrl } })
    }

    // ── Step 6: Email delivery ────────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "DELIVERING" } })

    await sendReportEmail({
      to: job.clientEmail,
      companyName: job.companyName,
      overallScore,
      reportUrl: `${process.env.NEXT_PUBLIC_APP_URL}/report/${jobId}?token=${job.reportToken}`,
      pdfUrl: pdfUrl ?? "",
    })

    // ── Done ──────────────────────────────────────────────────────────────
    await prisma.auditJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date() },
    })

    return { jobId, overallScore, pdfUrl }
  },
})
