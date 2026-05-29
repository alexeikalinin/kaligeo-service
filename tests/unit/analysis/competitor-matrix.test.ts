import { describe, it, expect } from "vitest"
import { buildCompetitorMatrix } from "@/lib/analysis/competitor-matrix"
import type { QueryResult } from "@prisma/client"

function makeResult(overrides: Partial<QueryResult> = {}): QueryResult {
  return {
    id: "qr-1",
    jobId: "job-1",
    platform: "CHATGPT",
    query: "лучший SEO-сервис",
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

describe("buildCompetitorMatrix", () => {
  it("returns empty array when no results", () => {
    expect(buildCompetitorMatrix([], ["seowork.ru"])).toEqual([
      { name: "seowork.ru", platforms: [], mentionCount: 0, queries: [] },
    ])
  })

  it("returns zero-count entries for competitors not mentioned", () => {
    const results = [makeResult({ competitors: [] as unknown as QueryResult["competitors"] })]
    const matrix = buildCompetitorMatrix(results, ["seowork.ru", "topvisor.com"])

    expect(matrix).toHaveLength(2)
    const seowork = matrix.find((e) => e.name === "seowork.ru")
    expect(seowork?.mentionCount).toBe(0)
  })

  it("counts mentions correctly", () => {
    const results = [
      makeResult({ competitors: ["seowork.ru"] as unknown as QueryResult["competitors"], platform: "CHATGPT", query: "q1" }),
      makeResult({ competitors: ["seowork.ru"] as unknown as QueryResult["competitors"], platform: "GEMINI",  query: "q2" }),
      makeResult({ competitors: [] as unknown as QueryResult["competitors"] }),
    ]

    const matrix = buildCompetitorMatrix(results, ["seowork.ru"])
    const entry = matrix.find((e) => e.name === "seowork.ru")

    expect(entry?.mentionCount).toBe(2)
    expect(entry?.platforms).toContain("CHATGPT")
    expect(entry?.platforms).toContain("GEMINI")
    expect(entry?.queries).toContain("q1")
    expect(entry?.queries).toContain("q2")
  })

  it("does not duplicate platforms for same competitor", () => {
    const results = [
      makeResult({ competitors: ["seowork.ru"] as unknown as QueryResult["competitors"], platform: "CHATGPT", query: "q1" }),
      makeResult({ competitors: ["seowork.ru"] as unknown as QueryResult["competitors"], platform: "CHATGPT", query: "q2" }),
    ]

    const matrix = buildCompetitorMatrix(results, ["seowork.ru"])
    const entry = matrix.find((e) => e.name === "seowork.ru")
    const chatgptOccurrences = entry?.platforms.filter((p) => p === "CHATGPT").length ?? 0
    expect(chatgptOccurrences).toBe(1)
  })

  it("sorts by mentionCount descending", () => {
    const results = [
      makeResult({ competitors: ["topvisor.com"] as unknown as QueryResult["competitors"] }),
      makeResult({ competitors: ["seowork.ru", "seowork.ru"] as unknown as QueryResult["competitors"] }),
      makeResult({ competitors: ["seowork.ru"] as unknown as QueryResult["competitors"] }),
    ]

    const matrix = buildCompetitorMatrix(results, ["seowork.ru", "topvisor.com"])
    expect(matrix[0].name).toBe("seowork.ru")   // 2 mentions > 1
  })

  it("handles empty competitors list", () => {
    const results = [makeResult({ competitors: ["seowork.ru"] as unknown as QueryResult["competitors"] })]
    const matrix = buildCompetitorMatrix(results, [])
    // Competitor found in results but not in predefined list — still tracked
    expect(matrix.find((e) => e.name === "seowork.ru")?.mentionCount).toBe(1)
  })

  it("does not duplicate queries for same competitor", () => {
    const results = [
      makeResult({ competitors: ["seowork.ru"] as unknown as QueryResult["competitors"], query: "q1" }),
      makeResult({ competitors: ["seowork.ru"] as unknown as QueryResult["competitors"], query: "q1" }),
    ]
    const matrix = buildCompetitorMatrix(results, ["seowork.ru"])
    const entry = matrix.find((e) => e.name === "seowork.ru")
    const q1count = entry?.queries.filter((q) => q === "q1").length ?? 0
    expect(q1count).toBe(1)
  })
})
