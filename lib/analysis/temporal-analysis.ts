/**
 * Temporal Analysis — Волна 2
 * Рассчитывает тренд-линии, velocity и прогнозы по серии аудитов.
 */

export interface AuditSnapshot {
  date: Date
  overallScore: number
  platformScores: Record<string, number>  // platform → score
}

export type TrendDirection = "up" | "down" | "stable"

export interface InflectionPoint {
  date: Date
  scoreBefore: number
  scoreAfter: number
  change: number
  direction: TrendDirection
}

export interface TrendAnalysis {
  /** Изменение в баллах за неделю (+ = рост, - = падение) */
  scoreVelocity: number
  /** Направление тренда */
  direction: TrendDirection
  /** Прогнозируемый score через 30 дней */
  projectedScore30d: number
  /** Прогнозируемый score через 90 дней */
  projectedScore90d: number
  /** Коэффициент детерминации (0–1): насколько тренд линейный */
  r2: number
  /** Точки перелома тренда */
  inflectionPoints: InflectionPoint[]
  /** Тренд по платформам: растут / падают / стабильны */
  platformTrends: Record<string, TrendDirection>
  /** Минимальный и максимальный score за период */
  rangeMin: number
  rangeMax: number
  /** Кол-во аудитов в выборке */
  dataPoints: number
}

/**
 * Простая линейная регрессия (МНК).
 * Возвращает slope (наклон) и r2 (качество подгонки).
 */
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; r2: number } {
  const n = xs.length
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0 }

  const sumX  = xs.reduce((a, b) => a + b, 0)
  const sumY  = ys.reduce((a, b) => a + b, 0)
  const sumXY = xs.reduce((acc, x, i) => acc + x * (ys[i] ?? 0), 0)
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0)

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 }

  const slope     = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n

  // R² = 1 - SS_res / SS_tot
  const yMean = sumY / n
  const ssTot = ys.reduce((acc, y) => acc + (y - yMean) ** 2, 0)
  const ssRes = ys.reduce((acc, y, i) => acc + (y - (slope * (xs[i] ?? 0) + intercept)) ** 2, 0)
  const r2    = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0

  return { slope, intercept, r2 }
}

/** Определяет направление тренда по velocity */
function toDirection(velocity: number): TrendDirection {
  if (velocity >  0.3) return "up"
  if (velocity < -0.3) return "down"
  return "stable"
}

/**
 * Вычисляет тренд-анализ по серии аудитов.
 * @param snapshots — минимум 2 снимка, отсортированных по дате (ascending)
 */
export function calculateTrendLine(snapshots: AuditSnapshot[]): TrendAnalysis {
  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime())
  const n = sorted.length

  if (n === 0) {
    return {
      scoreVelocity: 0, direction: "stable",
      projectedScore30d: 0, projectedScore90d: 0,
      r2: 0, inflectionPoints: [], platformTrends: {},
      rangeMin: 0, rangeMax: 0, dataPoints: 0,
    }
  }

  if (n === 1) {
    const s = sorted[0].overallScore
    return {
      scoreVelocity: 0, direction: "stable",
      projectedScore30d: s, projectedScore90d: s,
      r2: 0, inflectionPoints: [], platformTrends: {},
      rangeMin: s, rangeMax: s, dataPoints: 1,
    }
  }

  // Переводим даты в дни от первого аудита
  const t0 = sorted[0].date.getTime()
  const daysFromStart = sorted.map((s) => (s.date.getTime() - t0) / (1000 * 60 * 60 * 24))
  const scores = sorted.map((s) => s.overallScore)

  const { slope, intercept, r2 } = linearRegression(daysFromStart, scores)

  // velocity = Δpoints/week
  const scoreVelocity = Math.round(slope * 7 * 10) / 10

  // Прогнозы
  const lastDay = daysFromStart[n - 1] ?? 0
  const projectedScore30d = Math.max(0, Math.min(100, Math.round(intercept + slope * (lastDay + 30))))
  const projectedScore90d = Math.max(0, Math.min(100, Math.round(intercept + slope * (lastDay + 90))))

  // Inflection points: где delta сменила знак
  const inflectionPoints: InflectionPoint[] = []
  for (let i = 1; i < n - 1; i++) {
    const prevDelta = scores[i]! - scores[i - 1]!
    const nextDelta = scores[i + 1]! - scores[i]!
    // Смена знака: было падение — стало рост, или наоборот
    if (Math.sign(prevDelta) !== 0 && Math.sign(nextDelta) !== 0 && Math.sign(prevDelta) !== Math.sign(nextDelta)) {
      inflectionPoints.push({
        date: sorted[i].date,
        scoreBefore: scores[i - 1]!,
        scoreAfter: scores[i + 1]!,
        change: scores[i + 1]! - scores[i - 1]!,
        direction: nextDelta > 0 ? "up" : "down",
      })
    }
  }

  // Тренды по платформам
  const allPlatforms = new Set(sorted.flatMap((s) => Object.keys(s.platformScores)))
  const platformTrends: Record<string, TrendDirection> = {}

  for (const platform of allPlatforms) {
    const platScores = sorted
      .map((s, i) => ({ x: daysFromStart[i] ?? 0, y: s.platformScores[platform] }))
      .filter((p): p is { x: number; y: number } => p.y !== undefined)

    if (platScores.length < 2) {
      platformTrends[platform] = "stable"
      continue
    }

    const { slope: pSlope } = linearRegression(
      platScores.map((p) => p.x),
      platScores.map((p) => p.y)
    )
    platformTrends[platform] = toDirection(pSlope * 7)
  }

  return {
    scoreVelocity,
    direction: toDirection(scoreVelocity),
    projectedScore30d,
    projectedScore90d,
    r2: Math.round(r2 * 100) / 100,
    inflectionPoints,
    platformTrends,
    rangeMin: Math.min(...scores),
    rangeMax: Math.max(...scores),
    dataPoints: n,
  }
}
