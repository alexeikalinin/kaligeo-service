import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { compareAudits } from "@/lib/analysis/compare-audits"
import { getTierConfig } from "@/lib/gates"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get("token")

  const job = await prisma.auditJob.findUnique({
    where: { id },
    include: {
      report: true,
      baselineJob: { include: { report: true } },
    },
  })

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (job.reportToken !== token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (job.status !== "COMPLETED" || !job.report) {
    return NextResponse.json({ status: job.status, ready: false })
  }

  const tierConfig = getTierConfig(job.tier)
  let comparison = null

  if (tierConfig.hasComparison && job.baselineJob?.report) {
    const baseline = job.baselineJob
    const baselineReport = baseline.report!
    comparison = compareAudits(
      {
        overallScore: baselineReport.overallScore,
        visibilityScores: baselineReport.visibilityScores as never,
        weakPoints: baselineReport.weakPoints as never,
        competitorMatrix: baselineReport.competitorMatrix as never,
        companyName: baseline.companyName,
        createdAt: baseline.createdAt,
      },
      {
        overallScore: job.report.overallScore,
        visibilityScores: job.report.visibilityScores as never,
        weakPoints: job.report.weakPoints as never,
        competitorMatrix: job.report.competitorMatrix as never,
        companyName: job.companyName,
        createdAt: job.createdAt,
      }
    )
  }

  return NextResponse.json({
    ready: true,
    companyName: job.companyName,
    websiteUrl: job.websiteUrl,
    niche: job.niche,
    tier: job.tier,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    pdfUrl: job.pdfUrl,
    report: job.report,
    comparison,
  })
}
