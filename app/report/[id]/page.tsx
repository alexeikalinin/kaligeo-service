import { isCompetitorCategory, namedCompetitors } from "@/lib/analysis/competitor-names"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ReportDashboard } from "@/components/report/ReportDashboard"
import { ReportChatPanel } from "@/components/report/ReportChatPanel"
import { compareAudits } from "@/lib/analysis/compare-audits"
import { getTierConfig, type Tier } from "@/lib/gates"
import { calculateShareOfVoice } from "@/lib/analysis/share-of-voice"
import { calculateCompetitivePosition } from "@/lib/analysis/competitive-positioning"
import { buildNicheIntel } from "@/lib/analysis/build-niche-intel"
import { buildSourceEntries } from "@/lib/analysis/build-source-entries"
import { buildPlatformInsights } from "@/lib/analysis/build-platform-insights"
import { buildVerbatimQuotes } from "@/lib/analysis/build-verbatim-quotes"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

function ReportPending({ status, jobId }: { status: string; jobId: string }) {
  return (
    <div className="min-h-screen bg-[var(--bone)] flex items-center justify-center">
      <div className="text-center">
        <p className="text-[var(--ink-3)] text-sm mb-2">{status === "FAILED" ? "Аудит остановлен" : "Аудит в процессе"}</p>
        <p className="text-[var(--ink-3)] text-xs">Статус: {status}</p>
        <Link className="inline-block mt-5 underline" href={`/audit/${jobId}`}>Открыть страницу статуса →</Link>
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
          competitors: true,      // для verbatimQuotes (brandsMentioned)
          sentiment: true,
          mentionContext: true,   // Волна 3: семантическая классификация
          mentionQuality: true,   // Волна 3: quality score 0–100
        },
      },
    },
  })

  if (!job || job.reportToken !== token) notFound()

  if (job.status !== "COMPLETED" || !job.report) {
    return <ReportPending status={job.status} jobId={id} />
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

  report.competitorMatrix = report.competitorMatrix.filter(competitor => !isCompetitorCategory(competitor.name))
  const tierConfig = getTierConfig(job.tier as Tier)
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reportJson = job.report as unknown as Record<string, any>
  const sourcesReport = reportJson.sourcesReport ?? null
  const nicheBenchmark = reportJson.nicheBenchmark ?? null
  const competitorGaps = Array.isArray(reportJson.competitorGaps) ? reportJson.competitorGaps.filter((entry: { name: string }) => !isCompetitorCategory(entry.name)) : undefined
  const analysisNotes = reportJson.analysisNotes ?? null
  const contentRecommendations = reportJson.contentRecommendations ?? null

  const nicheIntel = buildNicheIntel(report.visibilityScores, report.competitorMatrix)
  const sources = sourcesReport ? buildSourceEntries(sourcesReport) : undefined
  const platformInsights = buildPlatformInsights(report.visibilityScores)
  const verbatimQuotes = tierConfig.hasAnalysisAgent ? buildVerbatimQuotes(job.queryResults) : undefined

  // SoV — вычисляем на сервере для STANDARD+
  let shareOfVoice = null
  let competitivePosition = null
  if (tierConfig.hasShareOfVoice && job.competitors.length > 0) {
    // queryResults уже загружены, но без sources — делаем отдельный запрос
    const fullResults = await prisma.queryResult.findMany({ where: { jobId: id } })
    if (fullResults.length > 0) {
      shareOfVoice = calculateShareOfVoice(fullResults, job.companyName, namedCompetitors(job.competitors))
      competitivePosition = calculateCompetitivePosition(fullResults, namedCompetitors(job.competitors))
    }
  }

  return (
    <>
      <ReportDashboard
        job={{
          id: job.id,
          companyName: job.companyName,
          websiteUrl: job.websiteUrl,
          niche: job.niche,
          tier: job.tier,
          coverage: getTierConfig(job.tier as Tier).platforms.map((platform) => ({
            platform,
            expected: Array.isArray(job.generatedQueries) ? job.generatedQueries.length : getTierConfig(job.tier as Tier).queryCount,
            answered: job.queryResults.filter((result) => result.platform === platform).length,
          })),
          pdfUrl: job.pdfUrl,
          completedAt: job.completedAt,
          clientEmail: job.clientEmail,
          reportToken: job.reportToken,
          queryResults: job.queryResults,
        }}
        report={report}
        comparison={comparison}
        sourcesReport={sourcesReport}
        shareOfVoice={shareOfVoice}
        competitivePosition={competitivePosition}
        nicheIntel={nicheIntel}
        sources={sources}
        platformInsights={platformInsights}
        verbatimQuotes={verbatimQuotes}
        competitorGaps={competitorGaps}
        nicheBenchmark={nicheBenchmark}
        analysisNotes={analysisNotes}
        contentRecommendations={contentRecommendations}
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
