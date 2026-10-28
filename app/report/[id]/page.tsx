import {compatibleMeasurements} from "@/lib/analysis/measurement-compatibility"
import { projectEntityAnswers } from "@/lib/analysis/entity-visibility"
import type { QuestionCard } from "@/lib/questions/question-cards"
import type { EntityMeasurement } from "@/lib/analysis/entity-visibility"
import { isBrandQuestion } from "@/lib/analysis/query-methodology"
import type { SiteEvidence } from "@/lib/analysis/site-evidence"
import type { CompetitorEvidence } from "@/lib/agents/competitor-discovery-agent"
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
          positionScore: true,
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
  const snapshot = job.analysisSnapshot as { questionCards?:QuestionCard[];entityMeasurements?:EntityMeasurement[];entityMeasurementVersion?:string; evidence?: SiteEvidence; methodologyVersion?: string; baselineSourceJobId?: string; competitorEvidence?: CompetitorEvidence[] } | null
  const directAnswers = job.queryResults.filter(r => isBrandQuestion(r.query))
  const tierConfig = getTierConfig(job.tier as Tier)
  const comparable = job.baselineJob && compatibleMeasurements(job,job.baselineJob)
  const comparison =
    tierConfig.hasComparison && comparable && job.baselineJob?.report
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
      shareOfVoice = calculateShareOfVoice(fullResults.filter(r => !isBrandQuestion(r.query)), job.companyName, namedCompetitors(job.competitors))
      competitivePosition = calculateCompetitivePosition(fullResults.filter(r => !isBrandQuestion(r.query)), namedCompetitors(job.competitors))
    }
  }

  return (
    <>
      {job.source==="qa-acceptance"&&!snapshot?.entityMeasurementVersion?<aside className="mx-auto max-w-6xl p-6 border border-amber-600">Исторический тестовый аудит: вопросы не прошли новую проверку. Результаты не используются как исходная точка новой методики.</aside>:null}
      {snapshot?.entityMeasurements?.length ? <section className="mx-auto max-w-6xl p-6 space-y-4"><h2 className="text-xl font-semibold">Видимость выбранных сущностей</h2><p>Упоминания компании, её продуктов и продавца считаются отдельно. Сводный индекс ниже — доля спонтанных ответов, в которых названа целевая сущность соответствующего вопроса. Прямые брендовые вопросы исключены. Это не оценка качества продуктов или доказательство знания компании моделью.</p>{snapshot.entityMeasurements.map((m,i)=><article key={`${m.entityId}-${m.metric}-${i}`} className="border rounded p-4"><h3>{m.name} · {{company:"Компания","owned-product":"Продукт портфеля",seller:"Продавец"}[m.metric]??m.metric} · {m.audienceName}</h3><p>{m.rate===null?"Не измерено":`${m.mentions} из ${m.answers} ответов — ${m.rate}%`}</p>{m.platforms.map(p=><p key={p.platform}>{p.platform}: {p.mentions}/{p.answers} ({p.rate}%)</p>)}<details><summary>Подтверждающие фрагменты ответов</summary>{m.evidence.map((e,j)=><blockquote key={j}><p>{e.platform}: {e.query}</p><p>{e.quote}</p></blockquote>)}</details></article>)}</section>:null}

      <ReportDashboard
        measurementMode={!!snapshot?.entityMeasurementVersion}
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
          queryResults: snapshot?.entityMeasurementVersion ? projectEntityAnswers(job.queryResults,snapshot.questionCards??[]) : job.queryResults,
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
      {(snapshot?.methodologyVersion || snapshot?.baselineSourceJobId) && <section className="mx-auto max-w-6xl px-6 py-8 text-sm space-y-4">
        <h2 className="text-xl font-semibold">Методика и подтверждения</h2>
        {job.baselineJobId && !comparable && <p>Динамика не рассчитывается: изменились вопросы, набор платформ или методика. Этот аудит нужно использовать как новую точку отсчёта.</p>}
        {snapshot.baselineSourceJobId && <p>Это первый замер мониторинга: использован готовый разовый аудит без повторного опроса AI. Динамика появится после следующего замера.</p>}
        {snapshot.methodologyVersion && <p>Вопросы сформированы для аудита, а не получены из статистики реальных обращений. Прямые вопросы о компании показаны отдельно и не входят в оценку спонтанной видимости.</p>}
        <p>Проверка сайта: {snapshot.evidence?.checkedAt ?? "не выполнена"}. Wikipedia: {snapshot.evidence?.wikipedia.status === "found" ? "найдена статья с совпадающим названием; содержание требует проверки" : "наличие не подтверждено — это не означает отсутствия статьи"}.</p>
        {snapshot.evidence?.wikipedia.urls.map(url => <p key={url}><a className="underline" href={url} rel="noreferrer" target="_blank">{url}</a></p>)}
        <details><summary className="cursor-pointer">Прямые вопросы о бренде ({directAnswers.length} ответов)</summary>
          {directAnswers.map(r => <article className="my-4 whitespace-pre-wrap" key={r.id}><strong>{r.platform}: {r.query}</strong><p>{r.response}</p></article>)}
          {!directAnswers.length && <p>Прямые вопросы в этом замере не задавались. Знание бренда не оценивалось.</p>}
        </details>
        <details><summary className="cursor-pointer">Альтернативные бренды в ответах AI</summary>
          <p>Это наблюдения в ответах моделей, а не независимо проверенный список конкурентов рынка.</p>
          {snapshot.competitorEvidence?.map((e, i) => <blockquote className="my-3 border-l pl-3" key={`${e.queryResultId}-${i}`}><strong>{e.name}</strong><p>{e.quote}</p></blockquote>)}
          {!snapshot.competitorEvidence?.length && <p>Подтверждённых цитат недостаточно.</p>}
        </details>
      </section>}
      {/* Chat panel — shown for all tiers, upgrade prompt for Basic */}
      <ReportChatPanel
        jobId={id}
        token={token ?? ""}
        companyName={job.companyName}
      />
    </>
  )
}
