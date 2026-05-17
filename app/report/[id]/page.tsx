import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ReportDashboard } from "@/components/report/ReportDashboard"
import { ReportChatPanel } from "@/components/report/ReportChatPanel"
import { compareAudits } from "@/lib/analysis/compare-audits"
import { getTierConfig } from "@/lib/gates"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

function ReportPending({ status }: { status: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-zinc-400 text-sm mb-2">Аудит в процессе</p>
        <p className="text-zinc-600 text-xs">Статус: {status}</p>
      </div>
    </div>
  )
}

export default async function ReportPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { token } = await searchParams

  const job = await prisma.auditJob.findUnique({
    where: { id },
    include: {
      report: true,
      baselineJob: { include: { report: true } },
      queryResults: {
        select: {
          id: true,
          platform: true,
          query: true,
          response: true,
          brandMentioned: true,
          sentiment: true,
        },
      },
    },
  })

  if (!job || job.reportToken !== token) notFound()

  if (job.status !== "COMPLETED" || !job.report) {
    return <ReportPending status={job.status} />
  }

  const report = job.report as unknown as {
    overallScore: number
    visibilityScores: Record<string, {
      platform: string; score: number; citationRate: number;
      totalQueries: number; mentionCount: number; positiveCount: number
    }>
    competitorMatrix: { name: string; platforms: string[]; mentionCount: number }[]
    weakPoints: { id: string; title: string; description: string; severity: "low" | "medium" | "high"; detected: boolean }[]
    actionPlan: {
      "30d": { title: string; description: string; effort: "low" | "medium" | "high"; impact: "low" | "medium" | "high" }[]
      "60d": { title: string; description: string; effort: "low" | "medium" | "high"; impact: "low" | "medium" | "high" }[]
      "90d": { title: string; description: string; effort: "low" | "medium" | "high"; impact: "low" | "medium" | "high" }[]
    }
  }

  const tierConfig = getTierConfig(job.tier)
  const comparison =
    tierConfig.hasComparison && job.baselineJob?.report
      ? compareAudits(
          {
            overallScore: job.baselineJob.report.overallScore,
            visibilityScores: job.baselineJob.report.visibilityScores as never,
            weakPoints: job.baselineJob.report.weakPoints as never,
            competitorMatrix: job.baselineJob.report.competitorMatrix as never,
            companyName: job.baselineJob.companyName,
            createdAt: job.baselineJob.createdAt,
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
      : null

  return (
    <>
      <ReportDashboard
        job={{
          id: job.id,
          companyName: job.companyName,
          websiteUrl: job.websiteUrl,
          niche: job.niche,
          tier: job.tier,
          pdfUrl: job.pdfUrl,
          completedAt: job.completedAt,
          queryResults: job.queryResults,
        }}
        report={report}
        comparison={comparison}
      />
      {/* Chat panel — shown for all tiers, upgrade prompt for Basic */}
      <ReportChatPanel
        jobId={id}
        token={token ?? ""}
        companyName={job.companyName}
      />
    </>
  )
}
