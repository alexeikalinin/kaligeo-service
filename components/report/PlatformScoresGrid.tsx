"use client"

import { PlatformScoreCard } from "./PlatformScoreCard"

interface PlatformScore {
  platform: string
  score: number
  citationRate: number
  totalQueries: number
  mentionCount: number
  positiveCount: number
}

interface WeakPoint {
  id: string
  title: string
  description: string
  severity: "high" | "medium" | "low"
}

interface Props {
  scores: Record<string, PlatformScore>
  weakPoints?: WeakPoint[]
  benchmarkScore?: number
  // platform → array of historical scores (oldest→newest)
  platformHistory?: Record<string, number[]>
}

export function PlatformScoresGrid({ scores, weakPoints, benchmarkScore, platformHistory }: Props) {
  const platforms = Object.values(scores).sort((a, b) => b.score - a.score)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {platforms.map((s) => (
        <PlatformScoreCard
          key={s.platform}
          score={s}
          weakPoints={weakPoints}
          benchmarkScore={benchmarkScore}
          history={platformHistory?.[s.platform]}
        />
      ))}
    </div>
  )
}
