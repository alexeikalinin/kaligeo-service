import type { PlatformScore } from "./calculate-scores"
import type { WeakPoint } from "./weak-points-checker"

export interface CompetitorDelta {
  name: string
  prevMentionCount: number
  currMentionCount: number
  delta: number
}

export interface PlatformDelta {
  scoreDelta: number
  citationRateDelta: number
  mentionCountDelta: number
  prevScore: number
  currScore: number
  prevCitationRate: number
  currCitationRate: number
}

export interface AuditComparison {
  scoreDelta: number
  platformDeltas: Record<string, PlatformDelta>
  weakPoints: {
    fixed: WeakPoint[]
    remaining: WeakPoint[]
    newlyDetected: WeakPoint[]
  }
  competitors: CompetitorDelta[]
  baseline: {
    overallScore: number
    createdAt: string
    companyName: string
  }
  current: {
    overallScore: number
    createdAt: string
  }
  daysBetween: number
}

interface CompetitorEntry {
  name: string
  mentionCount: number
}

interface ReportSnapshot {
  overallScore: number
  visibilityScores: Record<string, PlatformScore>
  weakPoints: WeakPoint[]
  competitorMatrix: CompetitorEntry[]
}

interface JobMeta {
  companyName: string
  createdAt: string | Date
}

export function compareAudits(
  baseline: ReportSnapshot & JobMeta,
  current: ReportSnapshot & JobMeta
): AuditComparison {
  const scoreDelta = current.overallScore - baseline.overallScore

  // Platform deltas
  const platformDeltas: Record<string, PlatformDelta> = {}
  const allPlatforms = new Set([
    ...Object.keys(baseline.visibilityScores),
    ...Object.keys(current.visibilityScores),
  ])
  for (const platform of allPlatforms) {
    const prev = baseline.visibilityScores[platform]
    const curr = current.visibilityScores[platform]
    if (!prev || !curr) continue
    platformDeltas[platform] = {
      prevScore: prev.score,
      currScore: curr.score,
      scoreDelta: curr.score - prev.score,
      prevCitationRate: prev.citationRate,
      currCitationRate: curr.citationRate,
      citationRateDelta: curr.citationRate - prev.citationRate,
      mentionCountDelta: curr.mentionCount - prev.mentionCount,
    }
  }

  // Weak points delta
  const prevById = new Map(baseline.weakPoints.map((w) => [w.id, w]))
  const currById = new Map(current.weakPoints.map((w) => [w.id, w]))

  const fixed: WeakPoint[] = []
  const remaining: WeakPoint[] = []
  const newlyDetected: WeakPoint[] = []

  for (const [id, prev] of prevById) {
    if (prev.detected) {
      const curr = currById.get(id)
      if (curr?.detected) {
        remaining.push(curr)
      } else {
        fixed.push(prev)
      }
    }
  }
  for (const [id, curr] of currById) {
    if (curr.detected && !prevById.get(id)?.detected) {
      newlyDetected.push(curr)
    }
  }

  // Competitor deltas
  const prevCompMap = new Map(baseline.competitorMatrix.map((c) => [c.name.toLowerCase(), c.mentionCount]))
  const competitors: CompetitorDelta[] = current.competitorMatrix.map((c) => {
    const prev = prevCompMap.get(c.name.toLowerCase()) ?? 0
    return {
      name: c.name,
      prevMentionCount: prev,
      currMentionCount: c.mentionCount,
      delta: c.mentionCount - prev,
    }
  })

  const baseDate = new Date(baseline.createdAt)
  const currDate = new Date(current.createdAt)
  const daysBetween = Math.round((currDate.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24))

  return {
    scoreDelta,
    platformDeltas,
    weakPoints: { fixed, remaining, newlyDetected },
    competitors,
    baseline: {
      overallScore: baseline.overallScore,
      createdAt: baseDate.toISOString(),
      companyName: baseline.companyName,
    },
    current: {
      overallScore: current.overallScore,
      createdAt: currDate.toISOString(),
    },
    daysBetween,
  }
}
