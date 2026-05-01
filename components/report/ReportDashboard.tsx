"use client"

import { useState } from "react"
import { ScoreHero } from "./ScoreHero"
import { PlatformScoresGrid } from "./PlatformScoresGrid"
import { CompetitorMatrixTable } from "./CompetitorMatrixTable"
import { WeakPointsList } from "./WeakPointsList"
import { ActionPlanTimeline } from "./ActionPlanTimeline"
import { QueryExplorer } from "./QueryExplorer"

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
    queryResults: {
      id: string
      platform: string
      query: string
      response: string
      brandMentioned: boolean
      sentiment: string
    }[]
  }
  report: {
    overallScore: number
    visibilityScores: Record<string, PlatformScore>
    competitorMatrix: CompetitorEntry[]
    weakPoints: WeakPoint[]
    actionPlan: { "30d": ActionItem[]; "60d": ActionItem[]; "90d": ActionItem[] }
  }
}

const TABS = [
  { key: "overview", label: "Обзор" },
  { key: "platforms", label: "Платформы" },
  { key: "competitors", label: "Конкуренты" },
  { key: "weakpoints", label: "Слабые места" },
  { key: "plan", label: "План роста" },
  { key: "queries", label: "Все запросы" },
] as const

type TabKey = (typeof TABS)[number]["key"]

export function ReportDashboard({ job, report }: ReportDashboardProps) {
  const [tab, setTab] = useState<TabKey>("overview")
  const hasPdf = job.tier !== "BASIC" && !!job.pdfUrl

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <ScoreHero
        companyName={job.companyName}
        websiteUrl={job.websiteUrl}
        overallScore={report.overallScore}
        pdfUrl={hasPdf ? job.pdfUrl : null}
        completedAt={job.completedAt}
      />

      <div className="sticky top-0 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 z-10">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "text-zinc-100 border-b-2 border-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {tab === "overview" && (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold mb-4 text-zinc-200">Видимость по платформам</h2>
              <PlatformScoresGrid scores={report.visibilityScores} />
            </section>
            <section>
              <h2 className="text-lg font-semibold mb-4 text-zinc-200">Ключевые проблемы</h2>
              <WeakPointsList weakPoints={report.weakPoints.slice(0, 3)} />
            </section>
          </div>
        )}
        {tab === "platforms" && (
          <div>
            <h2 className="text-lg font-semibold mb-6 text-zinc-200">Видимость по платформам</h2>
            <PlatformScoresGrid scores={report.visibilityScores} />
          </div>
        )}
        {tab === "competitors" && (
          <div>
            <h2 className="text-lg font-semibold mb-6 text-zinc-200">Матрица конкурентов</h2>
            <CompetitorMatrixTable
              matrix={report.competitorMatrix}
              companyName={job.companyName}
            />
          </div>
        )}
        {tab === "weakpoints" && (
          <div>
            <h2 className="text-lg font-semibold mb-6 text-zinc-200">Слабые места</h2>
            <WeakPointsList weakPoints={report.weakPoints} />
          </div>
        )}
        {tab === "plan" && (
          <div>
            <h2 className="text-lg font-semibold mb-6 text-zinc-200">План роста видимости</h2>
            <ActionPlanTimeline plan={report.actionPlan} />
          </div>
        )}
        {tab === "queries" && (
          <div>
            <h2 className="text-lg font-semibold mb-6 text-zinc-200">Все запросы</h2>
            <QueryExplorer results={job.queryResults} />
          </div>
        )}
      </div>
    </div>
  )
}
