import type { EntityMeasurement } from "@/lib/analysis/entity-visibility"
import { isCompetitorCategory } from "@/lib/analysis/competitor-names"
import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import { getTierConfig, type Tier } from "@/lib/gates"
import { prisma } from "@/lib/prisma"
import { ReportPDFDocument } from "@/components/pdf/ReportPDFDocument"

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const internalSecret = req.headers.get("x-internal-secret")
  if (!process.env.INTERNAL_SECRET || internalSecret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { jobId } = await req.json()
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })

  const job = await prisma.auditJob.findUnique({
    where: { id: jobId },
    include: { report: true, queryResults: { select: { platform: true } } },
  })

  if (!job || !job.report) {
    return NextResponse.json({ error: "Job or report not found" }, { status: 404 })
  }

  const report = job.report as unknown as {
    visibilityScores: Record<string, { platform: string; score: number; citationRate: number; totalQueries: number; mentionCount: number; positiveCount: number }>
    competitorMatrix: { name: string; platforms: string[]; mentionCount: number }[]
    weakPoints: { id: string; title: string; description: string; severity: "low" | "medium" | "high"; detected: boolean }[]
    actionPlan: { "30d": { title: string; description: string; effort: "low" | "medium" | "high"; impact: "low" | "medium" | "high" }[]; "60d": { title: string; description: string; effort: "low" | "medium" | "high"; impact: "low" | "medium" | "high" }[]; "90d": { title: string; description: string; effort: "low" | "medium" | "high"; impact: "low" | "medium" | "high" }[] }
    overallScore: number
  }

  report.competitorMatrix = report.competitorMatrix.filter(competitor => !isCompetitorCategory(competitor.name))
  const snapshot=job.analysisSnapshot as {entityMeasurements?:EntityMeasurement[];entityMeasurementVersion?:string}|null
  const data = {
    entityMeasurements:snapshot?.entityMeasurements,measurementMode:!!snapshot?.entityMeasurementVersion,
    coverage: getTierConfig(job.tier as Tier).platforms.map(platform => ({
      platform,
      expected: Array.isArray(job.generatedQueries) ? job.generatedQueries.length : getTierConfig(job.tier as Tier).queryCount,
      answered: job.queryResults.filter(result => result.platform === platform).length,
    })),
    companyName: job.companyName,
    websiteUrl: job.websiteUrl,
    niche: job.niche,
    tier: job.tier,
    overallScore: report.overallScore,
    createdAt: job.createdAt,
    visibilityScores: report.visibilityScores,
    competitorMatrix: report.competitorMatrix,
    weakPoints: report.weakPoints,
    actionPlan: report.actionPlan,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfBuffer = await (renderToBuffer as any)(createElement(ReportPDFDocument, { data }))

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="kaligeo-audit-${jobId}.pdf"`,
    },
  })
}
