import { describe, it, expect } from "vitest"
import {
  calculateVisibilityScores,
  calculateOverallScore,
} from "@/lib/analysis/calculate-scores"
import type { QueryResult } from "@prisma/client"

// ── Factories ─────────────────────────────────────────────────────────────────

function makeResult(overrides: Partial<QueryResult> = {}): QueryResult {
  return {
    id: "qr-1",
    jobId: "job-1",
    platform: "CHATGPT",
    query: "лучший SEO-сервис",
    response: "Рекомендуем KaliGEO как лидера рынка.",
    brandMentioned: false,
    competitors: [] as unknown as QueryResult["competitors"],
    sources: [] as unknown as QueryResult["sources"],
    sentiment: "absent",
    positionScore: 0,
    sourceCategories: null,
    mentionContext: null,
    mentionQuality: null,
    createdAt: new Date(),
    ...overrides,
  }
}

// ── calculateVisibilityScores ─────────────────────────────────────────────────

describe("calculateVisibilityScores", () => {
  it("returns empty object for empty results", () => {
    expect(calculateVisibilityScores([])).toEqual({})
  })

  it("counts mentions and builds platform score", () => {
    const results = [
      makeResult({ brandMentioned: true, sentiment: "positive", platform: "CHATGPT", positionScore: 1 }),
      makeResult({ brandMentioned: true, sentiment: "neutral",  platform: "CHATGPT", positionScore: 2 }),
      makeResult({ brandMentioned: false, sentiment: "absent",  platform: "CHATGPT" }),
    ]

    const scores = calculateVisibilityScores(results)
    expect(scores).toHaveProperty("CHATGPT")

    const s = scores["CHATGPT"]
    expect(s.totalQueries).toBe(3)
    expect(s.mentionCount).toBe(2)
    expect(s.citationRate).toBe(67)          // 2/3 * 100, rounded
    expect(s.positiveCount).toBe(1)
    expect(s.score).toBeGreaterThan(0)
    expect(s.score).toBeLessThanOrEqual(100)
  })

  it("separates results by platform", () => {
    const results = [
      makeResult({ platform: "CHATGPT", brandMentioned: true, sentiment: "positive" }),
      makeResult({ platform: "GEMINI",  brandMentioned: false, sentiment: "absent" }),
    ]

    const scores = calculateVisibilityScores(results)
    expect(Object.keys(scores)).toHaveLength(2)
    expect(scores["CHATGPT"].mentionCount).toBe(1)
    expect(scores["GEMINI"].mentionCount).toBe(0)
  })

  it("calculates score 0 when no mentions", () => {
    const results = [
      makeResult({ brandMentioned: false, sentiment: "absent" }),
      makeResult({ brandMentioned: false, sentiment: "absent" }),
    ]

    const scores = calculateVisibilityScores(results)
    const s = scores["CHATGPT"]
    // citationRate=0, positiveRate=0, positionNorm=0 (veto: no mentions), sourceRate=0
    // score = 0*40 + 0*25 + (0/100)*20 + 0*15 = 0
    expect(s.score).toBe(0)
    expect(s.mentionCount).toBe(0)
  })

  it("handles single result with mention and citation", () => {
    const results = [
      makeResult({
        brandMentioned: true,
        sentiment: "positive",
        positionScore: 1,
        sources: ["https://kaligeo.ru/blog"] as unknown as QueryResult["sources"],
      }),
    ]

    const scores = calculateVisibilityScores(results)
    const s = scores["CHATGPT"]
    expect(s.score).toBeGreaterThan(50)    // high visibility
    expect(s.citationRate).toBe(100)
  })
})

// ── calculateOverallScore ─────────────────────────────────────────────────────

describe("calculateOverallScore", () => {
  it("returns 0 for empty platform scores", () => {
    expect(calculateOverallScore({})).toBe(0)
  })

  it("returns the score when there is one platform", () => {
    const scores = {
      CHATGPT: { platform: "CHATGPT", score: 72, totalQueries: 10, mentionCount: 7,
        positiveCount: 4, citationRate: 70, avgPosition: 1.5,
        positionScore100: 87, sourceQualityScore: 50 },
    }
    expect(calculateOverallScore(scores)).toBe(72)
  })

  it("averages scores across platforms", () => {
    const base = {
      totalQueries: 10, mentionCount: 5, positiveCount: 3,
      citationRate: 50, avgPosition: 2, positionScore100: 75, sourceQualityScore: 40,
    }
    const scores = {
      CHATGPT: { ...base, platform: "CHATGPT", score: 60 },
      GEMINI:  { ...base, platform: "GEMINI",  score: 80 },
    }
    expect(calculateOverallScore(scores)).toBe(70)   // (60+80)/2
  })

  it("handles all-zero scores", () => {
    const base = {
      totalQueries: 5, mentionCount: 0, positiveCount: 0,
      citationRate: 0, avgPosition: 0, positionScore100: 0, sourceQualityScore: 0,
    }
    const scores = {
      CHATGPT: { ...base, platform: "CHATGPT", score: 0 },
      GEMINI:  { ...base, platform: "GEMINI",  score: 0 },
    }
    expect(calculateOverallScore(scores)).toBe(0)
  })

  it("handles all-100 scores", () => {
    const base = {
      totalQueries: 5, mentionCount: 5, positiveCount: 5,
      citationRate: 100, avgPosition: 1, positionScore100: 100, sourceQualityScore: 100,
    }
    const scores = {
      CHATGPT: { ...base, platform: "CHATGPT", score: 100 },
      GEMINI:  { ...base, platform: "GEMINI",  score: 100 },
    }
    expect(calculateOverallScore(scores)).toBe(100)
  })
})
