"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ScoreHero } from "./ScoreHero"
import { PlatformScoresGrid } from "./PlatformScoresGrid"
import { CompetitorMatrixTable } from "./CompetitorMatrixTable"
import { WeakPointsList } from "./WeakPointsList"
import { ActionPlanTimeline } from "./ActionPlanTimeline"
import { QueryExplorer } from "./QueryExplorer"
import { ExecutiveSummary } from "./ExecutiveSummary"
import { AIResponsesSample } from "./AIResponsesSample"
import { LockedTabPlaceholder } from "./LockedTabPlaceholder"
import { HallucinationAudit } from "./HallucinationAudit"
import type { HallucinationItem } from "./HallucinationAudit"
import { NicheIntelligence } from "./NicheIntelligence"
import { SourceAuthority } from "./SourceAuthority"
import type { SourceEntry } from "./SourceAuthority"
import { VerbatimInsights } from "./VerbatimInsights"
import type { VerbatimQuote } from "./VerbatimInsights"
import { PlatformIntelligence } from "./PlatformIntelligence"
import type { PlatformInsight } from "./PlatformIntelligence"
import { CompetitorGapAnalysis } from "./CompetitorGapAnalysis"
import { OpportunityMap } from "./OpportunityMap"
import { ProgressComparison } from "./ProgressComparison"
import type { AuditComparison } from "@/lib/analysis/compare-audits"
import { SourcesAnalysis } from "./SourcesAnalysis"
import { TrendsChart } from "./TrendsChart"
import { RecurringPanel } from "./RecurringPanel"
import { ShareOfVoiceTab } from "./ShareOfVoiceTab"
import type { ShareOfVoiceResult } from "@/lib/analysis/share-of-voice"
import type { CompetitivePosition } from "@/lib/analysis/competitive-positioning"
import { CitationReadinessCard } from "./CitationReadinessCard"
import { calculateCitationReadiness } from "@/lib/analysis/citation-readiness"
import { aggregateBrandRoles } from "@/lib/analysis/mention-extraction"

interface PlatformScore {
  platform: string
  score: number
  citationRate: number
  totalQueries: number
  mentionCount: number
  positiveCount: number
}

interface CompetitorEntry {
  name: string
  platforms: string[]
  mentionCount: number
}

interface WeakPoint {
  id: string
  title: string
  description: string
  severity: "low" | "medium" | "high"
  detected: boolean
}

interface ActionItem {
  title: string
  description: string
  effort: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
}

interface ReportDashboardProps {
  job: {
    id: string
    companyName: string
    websiteUrl: string
    niche: string
    tier: string
    pdfUrl: string | null
    completedAt: Date | null
    clientEmail?: string
    reportToken?: string
    queryResults: {
      id: string
      platform: string
      query: string
      response: string
      brandMentioned: boolean
      sentiment: string
      sources?: string[]
      mentionContext?: string | null
      mentionQuality?: number | null
    }[]
  }
  report: {
    overallScore: number
    visibilityScores: Record<string, PlatformScore>
    competitorMatrix: CompetitorEntry[]
    weakPoints: WeakPoint[]
    actionPlan: { "30d": ActionItem[]; "60d": ActionItem[]; "90d": ActionItem[] }
    hallucinationAudit?: HallucinationItem[]
  }
  nicheIntel?: {
    totalMentions: number
    topCompetitorMentions: number
    topCompetitorName: string
    avgOrderValue?: number
  }
  sources?: SourceEntry[]
  verbatimQuotes?: VerbatimQuote[]
  platformInsights?: PlatformInsight[]
  competitorGaps?: { name: string; score: number; theirSignals: string[]; yourSignals: string[] }[]
  comparison?: AuditComparison | null
  shareOfVoice?: ShareOfVoiceResult | null
  competitivePosition?: CompetitivePosition | null
  sourcesReport?: {
    topDomains: { domain: string; count: number; category: string }[]
    byCategory: Record<string, { urls: string[]; count: number }>
    totalSources: number
    competitorSourceAdvantage: { competitor: string; uniqueDomains: string[]; count: number }[]
  } | null
}

// ── Tier locking ─────────────────────────────────────────────────────────────

// MONITOR_* тиры приравниваются к базовым для целей разблокировки вкладок
const TIER_ORDER: Record<string, number> = {
  BASIC: 0, STANDARD: 1, ADVANCED: 2,
  MONITOR_START: 0, MONITOR_PRO: 1, MONITOR_AGENT: 2,
}

const TABS = [
  { key: "overview",    label: "Обзор",        availableFrom: "BASIC"    },
  { key: "platforms",   label: "Платформы",     availableFrom: "BASIC"    },
  { key: "sov",         label: "SoV",           availableFrom: "STANDARD" },
  { key: "competitors", label: "Конкуренты",    availableFrom: "STANDARD" },
  { key: "sources",     label: "Источники",     availableFrom: "STANDARD" },
  { key: "trends",      label: "История",       availableFrom: "STANDARD" },
  { key: "weakpoints",  label: "Слабые места",  availableFrom: "BASIC"    },
  { key: "plan",        label: "План роста",     availableFrom: "STANDARD" },
  { key: "progress",    label: "Прогресс",      availableFrom: "STANDARD" },
  { key: "queries",     label: "Все запросы",   availableFrom: "ADVANCED" },
] as const

type TabKey = (typeof TABS)[number]["key"]

function isTabLocked(tabAvailableFrom: string, userTier: string): boolean {
  return (TIER_ORDER[tabAvailableFrom] ?? 0) > (TIER_ORDER[userTier] ?? 0)
}

function getFirstAvailableTab(tier: string): TabKey {
  return TABS.find((t) => !isTabLocked(t.availableFrom, tier))?.key ?? "overview"
}

// ── Component ────────────────────────────────────────────────────────────────

export function ReportDashboard({ job, report, nicheIntel, sources, verbatimQuotes, platformInsights, competitorGaps, comparison, sourcesReport, shareOfVoice, competitivePosition }: ReportDashboardProps) {
  const [tab, setTab] = useState<TabKey>(() => getFirstAvailableTab(job.tier))

  // Reset tab when tier changes (e.g. demo tier selector)
  useEffect(() => {
    const tabDef = TABS.find((t) => t.key === tab)
    if (tabDef && isTabLocked(tabDef.availableFrom, job.tier)) {
      setTab(getFirstAvailableTab(job.tier))
    }
  }, [job.tier]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasPdf = job.tier !== "BASIC" && !!job.pdfUrl
  const hasWebsiteFix = job.tier === "ADVANCED"
  const benchmarkScore = job.tier !== "BASIC" ? 41 : undefined
  const hallucinations = report.hallucinationAudit ?? []

  const totalMentions = Object.values(report.visibilityScores).reduce((a, s) => a + s.mentionCount, 0)
  const totalQueries = Object.values(report.visibilityScores).reduce((a, s) => a + s.totalQueries, 0)
  const brandRoleStats = aggregateBrandRoles(job.queryResults)

  // Build sparkline history: [prevScore, currScore] per platform from comparison platformDeltas
  const platformHistory: Record<string, number[]> | undefined = comparison
    ? Object.fromEntries(
        Object.entries(comparison.platformDeltas).map(([platform, delta]) => [
          platform,
          [delta.prevScore, delta.currScore],
        ])
      )
    : undefined

  return (
    <div className="min-h-screen" style={{ background: "var(--bone)", color: "var(--ink)" }}>
      <ScoreHero
        companyName={job.companyName}
        websiteUrl={job.websiteUrl}
        overallScore={report.overallScore}
        pdfUrl={hasPdf ? job.pdfUrl : null}
        jobId={job.id}
        reportToken={job.reportToken}
        completedAt={job.completedAt}
        totalMentions={totalMentions}
        totalQueries={totalQueries}
        weakPoints={report.weakPoints}
        brandRoleStats={brandRoleStats}
        onGrowthPlanClick={!isTabLocked("STANDARD", job.tier) ? () => setTab("plan") : undefined}
      />

      {/* Tab nav */}
      <div
        className="sticky top-0 z-10 border-b"
        style={{ background: "rgba(250,250,247,0.92)", backdropFilter: "blur(8px)", borderColor: "var(--rule)" }}
      >
        <div className="max-w-5xl mx-auto px-4 flex items-center gap-0.5 overflow-x-auto">
          {TABS.map((t) => {
            const locked = isTabLocked(t.availableFrom, job.tier)
            const isActive = tab === t.key && !locked
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 px-3 py-3 text-sm font-medium whitespace-nowrap transition-colors"
                style={
                  isActive
                    ? { color: "var(--ink)", borderBottom: "2px solid var(--ink)" }
                    : locked
                    ? { color: "var(--ink-3)", opacity: 0.65 }
                    : { color: "var(--ink-3)" }
                }
              >
                {locked && <span style={{ fontSize: "11px" }}>🔒</span>}
                {t.label}
                {locked && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "var(--ink-3)",
                      border: "1px solid var(--rule)",
                      borderRadius: "3px",
                      padding: "1px 4px",
                    }}
                  >
                    {t.availableFrom === "STANDARD" ? "Std" : "Adv"}
                  </span>
                )}
              </button>
            )
          })}

          <div className="ml-auto shrink-0 pl-4">
            {hasWebsiteFix ? (
              <Link
                href={`/report/${job.id}/website-fix`}
                className="monotag transition-colors"
                style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Website Fix ✦
              </Link>
            ) : (
              <span className="monotag" style={{ color: "var(--ink-3)", cursor: "default" }}>
                Website Fix — Advanced
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-5xl mx-auto px-4 py-8">

        {tab === "overview" && (
          <div className="space-y-10">
            <ExecutiveSummary
              companyName={job.companyName}
              overallScore={report.overallScore}
              platformScores={report.visibilityScores}
              weakPoints={report.weakPoints}
              competitorMatrix={report.competitorMatrix}
              tier={job.tier}
              benchmarkScore={benchmarkScore}
            />
            {nicheIntel && (
              <NicheIntelligence
                niche={job.niche}
                overallScore={report.overallScore}
                totalQueries={Object.values(report.visibilityScores).reduce((acc, s) => acc + s.totalQueries, 0)}
                totalMentions={nicheIntel.totalMentions}
                topCompetitorMentions={nicheIntel.topCompetitorMentions}
                topCompetitorName={nicheIntel.topCompetitorName}
                avgOrderValue={nicheIntel.avgOrderValue}
                tier={job.tier}
              />
            )}
            <section>
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--ink)" }}>
                Видимость по платформам
              </h2>
              <PlatformScoresGrid scores={report.visibilityScores} weakPoints={report.weakPoints} benchmarkScore={benchmarkScore} platformHistory={platformHistory} />
            </section>
            <section>
              <h2 className="text-lg font-bold mb-4" style={{ color: "var(--ink)" }}>
                Ключевые проблемы
              </h2>
              <WeakPointsList weakPoints={report.weakPoints.slice(0, 3)} />
            </section>
            {(() => {
              const crs = calculateCitationReadiness(report.weakPoints, report.visibilityScores)
              return (
                <CitationReadinessCard
                  score={crs.score}
                  contextual={crs.contextual}
                  structural={crs.structural}
                  referential={crs.referential}
                  signals={crs.signals}
                  capApplied={crs.capApplied}
                />
              )
            })()}
            {job.tier === "BASIC" && (
              <section>
                <p className="t-eyebrow mb-2">⚡ С чего начать</p>
                <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}>
                  Одно действие на этой неделе
                </h2>
                <div className="rounded-xl p-5 space-y-3" style={{ border: "2px solid var(--accent)", background: "var(--bone-2)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-bold" style={{ color: "var(--ink)" }}>Добавить Schema.org разметку на сайт</p>
                    <span className="monotag shrink-0" style={{ color: "var(--accent)", borderColor: "var(--accent)" }}>30 минут</span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
                    Вставьте JSON-LD блок с описанием организации в &lt;head&gt; главной страницы.
                    Это самый быстрый способ дать AI-системам понять кто вы, что предлагаете и где работаете.
                  </p>
                  <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "var(--bone)", color: "var(--ink-2)", border: "1px solid var(--rule)" }}>
                    <span style={{ color: "var(--accent)", fontWeight: 600 }}>→ </span>
                    ChatGPT и Claude начнут правильно идентифицировать компанию через 2–4 недели
                  </div>
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                    Полный план с 15+ конкретными шагами, готовым кодом и контент-планом — в тарифе Standard
                  </p>
                </div>
              </section>
            )}
            <AIResponsesSample results={job.queryResults} companyName={job.companyName} />

            {/* Recurring monitoring panel */}
            {job.reportToken && (
              <RecurringPanel jobId={job.id} token={job.reportToken} tier={job.tier} />
            )}
            {verbatimQuotes && !isTabLocked("ADVANCED", job.tier) && (
              <VerbatimInsights quotes={verbatimQuotes} companyName={job.companyName} />
            )}

            {/* Re-audit CTA */}
          </div>
        )}

        {tab === "platforms" && (
          <div className="space-y-10">
            <div>
              <h2 className="text-lg font-bold mb-6" style={{ color: "var(--ink)" }}>
                Видимость по платформам
              </h2>
              <PlatformScoresGrid scores={report.visibilityScores} weakPoints={report.weakPoints} benchmarkScore={benchmarkScore} platformHistory={platformHistory} />
            </div>
            {platformInsights && platformInsights.length > 0 && (
              <PlatformIntelligence insights={platformInsights} />
            )}
          </div>
        )}

        {tab === "sov" && (
          isTabLocked("STANDARD", job.tier)
            ? <LockedTabPlaceholder requiredTier="STANDARD" tabKey="sov" />
            : shareOfVoice && competitivePosition
              ? (
                <ShareOfVoiceTab
                  companyName={job.companyName}
                  sov={shareOfVoice}
                  positioning={competitivePosition}
                />
              )
              : (
                <div
                  className="rounded-xl p-8 text-center"
                  style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
                >
                  <p className="font-semibold mb-2" style={{ color: "var(--ink)" }}>
                    Нет данных для Share of Voice
                  </p>
                  <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                    Для расчёта SoV укажите конкурентов при следующем аудите.
                  </p>
                </div>
              )
        )}

        {tab === "competitors" && (
          isTabLocked("STANDARD", job.tier)
            ? <LockedTabPlaceholder requiredTier="STANDARD" tabKey="competitors" />
            : (
              <div className="space-y-10">
                <div>
                  <h2 className="text-lg font-bold mb-6" style={{ color: "var(--ink)" }}>
                    Матрица конкурентов
                  </h2>
                  <CompetitorMatrixTable
                    matrix={report.competitorMatrix}
                    companyName={job.companyName}
                    brandMentionCount={totalMentions}
                    brandPlatformCount={Object.keys(report.visibilityScores).length}
                  />
                </div>
                {competitorGaps && competitorGaps.length > 0 && (
                  <CompetitorGapAnalysis
                    gaps={competitorGaps}
                    companyName={job.companyName}
                  />
                )}
                <OpportunityMap
                  results={job.queryResults}
                  companyName={job.companyName}
                  competitorNames={report.competitorMatrix.map((c) => c.name)}
                />
                {sources && sources.length > 0 && (
                  <SourceAuthority
                    sources={sources}
                    companyName={job.companyName}
                    youPresent={[]}
                  />
                )}
              </div>
            )
        )}

        {tab === "sources" && (
          isTabLocked("STANDARD", job.tier)
            ? <LockedTabPlaceholder requiredTier="STANDARD" tabKey="sources" />
            : (
              <div>
                <h2 className="text-lg font-bold mb-2" style={{ color: "var(--ink)" }}>
                  RAG-источники
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
                  Сайты, которые нейросети использовали как источники при формировании ответов
                </p>
                {sourcesReport ? (
                  <SourcesAnalysis sourcesReport={sourcesReport as any} />
                ) : (
                  <div
                    className="rounded-xl p-8 text-center"
                    style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
                  >
                    <p style={{ color: "var(--ink-3)" }}>
                      Данные по источникам появятся после следующего аудита
                    </p>
                  </div>
                )}
              </div>
            )
        )}

        {tab === "trends" && (
          isTabLocked("STANDARD", job.tier)
            ? <LockedTabPlaceholder requiredTier="STANDARD" tabKey="trends" />
            : (
              <div>
                <h2 className="text-lg font-bold mb-2" style={{ color: "var(--ink)" }}>
                  История видимости
                </h2>
                <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
                  Динамика AI-видимости по всем аудитам компании {job.companyName}
                </p>
                <TrendsChart
                  jobId={job.id}
                  token={job.reportToken ?? ""}
                  clientEmail={job.clientEmail ?? ""}
                  companyName={job.companyName}
                />
              </div>
            )
        )}

        {tab === "weakpoints" && (
          <div>
            <h2 className="text-lg font-bold mb-6" style={{ color: "var(--ink)" }}>
              Слабые места
            </h2>
            <WeakPointsList weakPoints={report.weakPoints} />
            <HallucinationAudit items={hallucinations} />
          </div>
        )}

        {tab === "plan" && (
          isTabLocked("STANDARD", job.tier)
            ? <LockedTabPlaceholder requiredTier="STANDARD" tabKey="plan" />
            : (
              <div>
                <h2 className="text-lg font-bold mb-6" style={{ color: "var(--ink)" }}>
                  План роста видимости
                </h2>
                <ActionPlanTimeline plan={report.actionPlan} />
              </div>
            )
        )}

        {tab === "progress" && (
          isTabLocked("STANDARD", job.tier)
            ? <LockedTabPlaceholder requiredTier="STANDARD" tabKey="progress" />
            : comparison
              ? (
                <div>
                  <h2 className="text-lg font-bold mb-6" style={{ color: "var(--ink)" }}>
                    Прогресс с предыдущего аудита
                  </h2>
                  <ProgressComparison comparison={comparison} />
                </div>
              )
              : (
                <div className="py-16 text-center space-y-3">
                  <p className="text-base font-semibold" style={{ color: "var(--ink)" }}>
                    Нет базового аудита для сравнения
                  </p>
                  <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                    При следующем аудите укажите этот отчёт как baseline, чтобы видеть динамику.
                  </p>
                </div>
              )
        )}

        {tab === "queries" && (
          isTabLocked("ADVANCED", job.tier)
            ? <LockedTabPlaceholder requiredTier="ADVANCED" tabKey="queries" />
            : (
              <div>
                <h2 className="text-lg font-bold mb-6" style={{ color: "var(--ink)" }}>
                  Все запросы
                </h2>
                <QueryExplorer results={job.queryResults as Parameters<typeof QueryExplorer>[0]["results"]} />
              </div>
            )
        )}
      </div>
    </div>
  )
}
