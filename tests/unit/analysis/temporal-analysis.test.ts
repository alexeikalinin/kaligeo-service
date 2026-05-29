import { describe, it, expect } from "vitest"
import { calculateTrendLine } from "@/lib/analysis/temporal-analysis"
import type { AuditSnapshot } from "@/lib/analysis/temporal-analysis"

function day(n: number): Date {
  const d = new Date("2026-01-01")
  d.setDate(d.getDate() + n)
  return d
}

function snap(daysOffset: number, score: number, platforms: Record<string, number> = {}): AuditSnapshot {
  return { date: day(daysOffset), overallScore: score, platformScores: platforms }
}

describe("calculateTrendLine", () => {
  it("handles empty snapshots array", () => {
    const result = calculateTrendLine([])
    expect(result.dataPoints).toBe(0)
    expect(result.direction).toBe("stable")
    expect(result.scoreVelocity).toBe(0)
  })

  it("handles single snapshot", () => {
    const result = calculateTrendLine([snap(0, 50)])
    expect(result.dataPoints).toBe(1)
    expect(result.direction).toBe("stable")
    expect(result.projectedScore30d).toBe(50)
    expect(result.projectedScore90d).toBe(50)
    expect(result.rangeMin).toBe(50)
    expect(result.rangeMax).toBe(50)
  })

  it("detects upward trend for consistently growing scores", () => {
    const snapshots = [
      snap(0, 30),
      snap(30, 45),
      snap(60, 60),
      snap(90, 75),
    ]
    const result = calculateTrendLine(snapshots)

    expect(result.direction).toBe("up")
    expect(result.scoreVelocity).toBeGreaterThan(0)
    expect(result.projectedScore30d).toBeGreaterThan(75)
  })

  it("detects downward trend for declining scores", () => {
    const snapshots = [
      snap(0, 80),
      snap(30, 65),
      snap(60, 50),
      snap(90, 35),
    ]
    const result = calculateTrendLine(snapshots)

    expect(result.direction).toBe("down")
    expect(result.scoreVelocity).toBeLessThan(0)
    expect(result.projectedScore30d).toBeLessThan(35)
  })

  it("detects stable trend for flat scores", () => {
    const snapshots = [
      snap(0, 50),
      snap(30, 51),
      snap(60, 49),
      snap(90, 50),
    ]
    const result = calculateTrendLine(snapshots)

    expect(result.direction).toBe("stable")
    expect(Math.abs(result.scoreVelocity)).toBeLessThan(0.5)
  })

  it("sorts unsorted input by date", () => {
    const snapshots = [
      snap(60, 60),
      snap(0, 30),
      snap(30, 45),
    ]
    const result = calculateTrendLine(snapshots)

    // Should still detect upward trend despite unsorted input
    expect(result.direction).toBe("up")
    expect(result.dataPoints).toBe(3)
  })

  it("calculates correct rangeMin and rangeMax", () => {
    const snapshots = [snap(0, 20), snap(30, 80), snap(60, 50)]
    const result = calculateTrendLine(snapshots)

    expect(result.rangeMin).toBe(20)
    expect(result.rangeMax).toBe(80)
  })

  it("caps projections at 0 (no negative score)", () => {
    const snapshots = [snap(0, 20), snap(30, 10), snap(60, 5)]
    const result = calculateTrendLine(snapshots)

    expect(result.projectedScore30d).toBeGreaterThanOrEqual(0)
    expect(result.projectedScore90d).toBeGreaterThanOrEqual(0)
  })

  it("caps projections at 100 (max score)", () => {
    const snapshots = [snap(0, 85), snap(30, 92), snap(60, 98)]
    const result = calculateTrendLine(snapshots)

    expect(result.projectedScore30d).toBeLessThanOrEqual(100)
    expect(result.projectedScore90d).toBeLessThanOrEqual(100)
  })

  it("detects inflection point where trend reverses", () => {
    const snapshots = [
      snap(0, 50),
      snap(30, 30),  // drop
      snap(60, 60),  // recovery — inflection here
      snap(90, 70),
    ]
    const result = calculateTrendLine(snapshots)

    expect(result.inflectionPoints.length).toBeGreaterThan(0)
  })

  it("calculates platform trends independently", () => {
    const snapshots = [
      snap(0, 50, { CHATGPT: 40, GEMINI: 70 }),
      snap(30, 60, { CHATGPT: 60, GEMINI: 60 }),
      snap(60, 70, { CHATGPT: 80, GEMINI: 50 }),
    ]
    const result = calculateTrendLine(snapshots)

    expect(result.platformTrends["CHATGPT"]).toBe("up")
    expect(result.platformTrends["GEMINI"]).toBe("down")
  })

  it("r2 close to 1 for perfect linear trend", () => {
    // Perfect linear: score = 30 + 10 * week
    const snapshots = [
      snap(0, 30),
      snap(7, 40),
      snap(14, 50),
      snap(21, 60),
      snap(28, 70),
    ]
    const result = calculateTrendLine(snapshots)

    expect(result.r2).toBeGreaterThan(0.98)
  })

  it("velocity is in points-per-week units", () => {
    // Score increases by exactly 7 points over 7 days → velocity = 7
    const snapshots = [snap(0, 50), snap(7, 57)]
    const result = calculateTrendLine(snapshots)

    expect(result.scoreVelocity).toBeCloseTo(7, 0)
  })
})
