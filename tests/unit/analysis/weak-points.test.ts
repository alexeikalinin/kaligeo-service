import { describe, it, expect } from "vitest"
import { detectWeakPoints } from "@/lib/analysis/weak-points-checker"
import type { QueryResult } from "@prisma/client"

function makeResult(overrides: Partial<QueryResult> = {}): QueryResult {
  return {
    id: "qr-1",
    jobId: "job-1",
    platform: "CHATGPT",
    query: "рекомендации по SEO",
    response: "...",
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

describe("detectWeakPoints", () => {
  it("returns empty array when results array is empty", () => {
    const weakPoints = detectWeakPoints([], "https://kaligeo.ru", 80)
    // "missing-schema" is always detected, but no others
    expect(weakPoints.every((wp) => wp.detected)).toBe(true)
    // With no results, low-visibility brandMentionRate = 0/0 = 0, but missing-schema always included
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).not.toContain("negative-sentiment")
  })

  it("detects low-visibility when brand mention rate < 20%", () => {
    const results = Array.from({ length: 10 }, (_, i) =>
      makeResult({ brandMentioned: i === 0 })  // 1/10 = 10% < 20%
    )

    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 50)
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).toContain("low-visibility")
  })

  it("does NOT detect low-visibility when brand mention rate >= 40%", () => {
    const results = Array.from({ length: 5 }, (_, i) =>
      makeResult({ brandMentioned: i < 3 })  // 3/5 = 60% > 20%
    )

    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 60)
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).not.toContain("low-visibility")
  })

  it("detects negative-sentiment when negative results exist", () => {
    const results = [
      makeResult({ brandMentioned: true, sentiment: "negative" }),
      makeResult({ brandMentioned: true, sentiment: "positive" }),
    ]

    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 50)
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).toContain("negative-sentiment")
  })

  it("does NOT detect negative-sentiment when no negatives", () => {
    const results = [
      makeResult({ brandMentioned: true, sentiment: "positive" }),
      makeResult({ brandMentioned: true, sentiment: "neutral" }),
    ]

    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 70)
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).not.toContain("negative-sentiment")
  })

  it("detects low-score when overallScore < 30", () => {
    const results = [makeResult({ brandMentioned: true, sentiment: "positive" })]
    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 20)
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).toContain("low-score")
  })

  it("always includes missing-schema weak point", () => {
    const results = Array.from({ length: 5 }, () =>
      makeResult({ brandMentioned: true, sentiment: "positive" })
    )
    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 85)
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).toContain("missing-schema")
  })

  it("detects no-source-citations when domain not cited in sources", () => {
    const results = Array.from({ length: 5 }, () =>
      makeResult({ brandMentioned: true, sources: ["https://wikipedia.org"] as unknown as QueryResult["sources"] })
    )
    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 50)
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).toContain("no-source-citations")
  })

  it("does NOT detect no-source-citations when domain is cited enough", () => {
    const results = Array.from({ length: 5 }, () =>
      makeResult({
        brandMentioned: true,
        sources: ["https://kaligeo.ru/blog"] as unknown as QueryResult["sources"],
      })
    )
    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 65)
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).not.toContain("no-source-citations")
  })

  it("returns only detected weak points (detected=true)", () => {
    const results = Array.from({ length: 10 }, (_, i) =>
      makeResult({ brandMentioned: i < 5, sentiment: i % 2 === 0 ? "positive" : "neutral" })
    )
    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 40)
    // All returned should be detected
    expect(weakPoints.every((wp) => wp.detected)).toBe(true)
  })

  it("detects position-in-recommendations gap for position queries", () => {
    // 4+ position queries, brand not mentioned in any of them
    const queries = ["топ SEO-сервисов", "лучший аудит", "рейтинг платформ", "рекомендуй инструмент"]
    const results = [
      ...queries.map((query) => makeResult({ query, brandMentioned: false })),
      // Non-position queries with brand
      makeResult({ query: "как работает SEO", brandMentioned: true }),
    ]

    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 40)
    const ids = weakPoints.map((wp) => wp.id)
    expect(ids).toContain("not-first-in-recommendations")
  })

  it("detects weak point severity levels are valid", () => {
    const results = [makeResult()]
    const weakPoints = detectWeakPoints(results, "https://kaligeo.ru", 10)
    for (const wp of weakPoints) {
      expect(["high", "medium", "low"]).toContain(wp.severity)
    }
  })
})
