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

interface Props {
  scores: Record<string, PlatformScore>
}

export function PlatformScoresGrid({ scores }: Props) {
  const platforms = Object.values(scores).sort((a, b) => b.score - a.score)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {platforms.map((s) => (
        <PlatformScoreCard key={s.platform} score={s} />
      ))}
    </div>
  )
}
