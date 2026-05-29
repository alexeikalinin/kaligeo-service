import { describe, it, expect } from "vitest"
import { compareAudits } from "@/lib/analysis/compare-audits"
import type { PlatformScore } from "@/lib/analysis/calculate-scores"
import type { WeakPoint } from "@/lib/analysis/weak-points-checker"

// ── Factories ─────────────────────────────────────────────────────────────────

function makePlatformScore(score: number, mentionCount = 5, citationRate = 50): PlatformScore {
  return {
    platform: "CHATGPT",
    score,
    totalQueries: 10,
    mentionCount,
    positiveCount: 3,
    citationRate,
    avgPosition: 2,
    positionScore100: 75,
    sourceQualityScore: 60,
  }
}

function makeWeakPoint(id: string, detected = true, severity: WeakPoint["severity"] = "medium"): WeakPoint {
  return { id, title: id, description: id, severity, detected }
}

function makeSnapshot(overallScore: number, platformScore = 50, createdAt = "2026-01-01") {
  return {
    overallScore,
    visibilityScores: { CHATGPT: { ...makePlatformScore(platformScore), platform: "CHATGPT" } },
    weakPoints: [],
    competitorMatrix: [],
    companyName: "TestCo",
    createdAt,
  }
}

// ── compareAudits ─────────────────────────────────────────────────────────────

describe("compareAudits", () => {
  it("calculates positive scoreDelta when score improved", () => {
    const baseline = makeSnapshot(40, 40, "2026-01-01")
    const current  = makeSnapshot(65, 65, "2026-02-01")

    const result = compareAudits(baseline, current)
    expect(result.scoreDelta).toBe(25)
  })

  it("calculates negative scoreDelta when score dropped", () => {
    const baseline = makeSnapshot(70)
    const current  = makeSnapshot(50)

    const result = compareAudits(baseline, current)
    expect(result.scoreDelta).toBe(-20)
  })

  it("returns zero scoreDelta when scores equal", () => {
    const snap = makeSnapshot(55)
    const result = compareAudits(snap, snap)
    expect(result.scoreDelta).toBe(0)
  })

  it("calculates platform deltas correctly", () => {
    const baseline = {
      ...makeSnapshot(40),
      visibilityScores: {
        CHATGPT: { ...makePlatformScore(40, 4, 40), platform: "CHATGPT" },
        GEMINI:  { ...makePlatformScore(60, 6, 60), platform: "GEMINI" },
      },
    }
    const current = {
      ...makeSnapshot(55),
      visibilityScores: {
        CHATGPT: { ...makePlatformScore(70, 7, 70), platform: "CHATGPT" },
        GEMINI:  { ...makePlatformScore(50, 5, 50), platform: "GEMINI" },
      },
    }

    const result = compareAudits(baseline, current)

    expect(result.platformDeltas["CHATGPT"]?.scoreDelta).toBe(30)   // 70-40
    expect(result.platformDeltas["CHATGPT"]?.citationRateDelta).toBe(30) // 70-40
    expect(result.platformDeltas["GEMINI"]?.scoreDelta).toBe(-10)   // 50-60
  })

  it("classifies fixed weak points (present in baseline, gone in current)", () => {
    const baseline = { ...makeSnapshot(40), weakPoints: [makeWeakPoint("low-visibility")] }
    const current  = { ...makeSnapshot(70), weakPoints: [] }

    const result = compareAudits(baseline, current)
    expect(result.weakPoints.fixed.map((w) => w.id)).toContain("low-visibility")
    expect(result.weakPoints.remaining).toHaveLength(0)
  })

  it("classifies remaining weak points (present in both)", () => {
    const wp = makeWeakPoint("missing-schema")
    const baseline = { ...makeSnapshot(40), weakPoints: [wp] }
    const current  = { ...makeSnapshot(50), weakPoints: [wp] }

    const result = compareAudits(baseline, current)
    expect(result.weakPoints.remaining.map((w) => w.id)).toContain("missing-schema")
    expect(result.weakPoints.fixed).toHaveLength(0)
  })

  it("classifies newly detected weak points (absent in baseline, appeared in current)", () => {
    const baseline = { ...makeSnapshot(60), weakPoints: [] }
    const current  = { ...makeSnapshot(30), weakPoints: [makeWeakPoint("low-score")] }

    const result = compareAudits(baseline, current)
    expect(result.weakPoints.newlyDetected.map((w) => w.id)).toContain("low-score")
  })

  it("calculates competitor deltas correctly", () => {
    const baseline = {
      ...makeSnapshot(50),
      competitorMatrix: [{ name: "seowork.ru", mentionCount: 5 }],
    }
    const current = {
      ...makeSnapshot(55),
      competitorMatrix: [{ name: "seowork.ru", mentionCount: 8 }],
    }

    const result = compareAudits(baseline, current)
    const seowork = result.competitors.find((c) => c.name === "seowork.ru")
    expect(seowork?.delta).toBe(3)
    expect(seowork?.prevMentionCount).toBe(5)
    expect(seowork?.currMentionCount).toBe(8)
  })

  it("sets delta=0 for competitor not in baseline", () => {
    const baseline = { ...makeSnapshot(50), competitorMatrix: [] }
    const current  = { ...makeSnapshot(55), competitorMatrix: [{ name: "new-comp.ru", mentionCount: 3 }] }

    const result = compareAudits(baseline, current)
    const newComp = result.competitors.find((c) => c.name === "new-comp.ru")
    expect(newComp?.prevMentionCount).toBe(0)
    expect(newComp?.delta).toBe(3)
  })

  it("calculates daysBetween correctly", () => {
    const baseline = makeSnapshot(40, 40, "2026-01-01")
    const current  = makeSnapshot(60, 60, "2026-02-01")

    const result = compareAudits(baseline, current)
    expect(result.daysBetween).toBe(31)
  })

  it("preserves baseline and current metadata", () => {
    const baseline = { ...makeSnapshot(40, 40, "2026-01-15"), companyName: "OldCo" }
    const current  = { ...makeSnapshot(65, 65, "2026-03-15"), companyName: "NewCo" }

    const result = compareAudits(baseline, current)
    expect(result.baseline.overallScore).toBe(40)
    expect(result.baseline.companyName).toBe("OldCo")
    expect(result.current.overallScore).toBe(65)
  })
})
