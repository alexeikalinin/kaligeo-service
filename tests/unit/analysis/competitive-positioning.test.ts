import { describe, it, expect } from "vitest"
import { calculateCompetitivePosition } from "@/lib/analysis/competitive-positioning"
import type { QueryResult } from "@prisma/client"

function makeResult(overrides: Partial<QueryResult & { positionScore: number }> = {}): QueryResult {
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

describe("calculateCompetitivePosition", () => {
  it("rank=1 when brand mentioned more than all competitors", () => {
    const results = [
      makeResult({ brandMentioned: true,  competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: true,  competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: ["comp.ru"] as unknown as QueryResult["competitors"] }),
    ]
    const pos = calculateCompetitivePosition(results, ["comp.ru"])

    expect(pos.rank).toBe(1)
    expect(pos.totalParticipants).toBe(2)  // brand + 1 competitor
  })

  it("rank>1 when competitors mentioned more than brand", () => {
    const results = [
      makeResult({ brandMentioned: true,  competitors: ["comp.ru", "comp2.ru"] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: ["comp.ru"] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: ["comp2.ru"] as unknown as QueryResult["competitors"] }),
    ]
    const pos = calculateCompetitivePosition(results, ["comp.ru", "comp2.ru"])

    // comp.ru and comp2.ru both have 2 mentions, brand has 1 → brand is 3rd
    expect(pos.rank).toBeGreaterThan(1)
  })

  it("calculates firstMentionRate as percentage of ALL results (not just mentions)", () => {
    const results = [
      makeResult({ brandMentioned: true, positionScore: 1, competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: true, positionScore: 1, competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: true, positionScore: 3, competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: [] as unknown as QueryResult["competitors"] }),
    ]
    const pos = calculateCompetitivePosition(results, [])

    // formula: brandFirstMentions / results.length * 100 = 2/4 * 100 = 50%
    expect(pos.firstMentionRate).toBe(50)
  })

  it("returns positioningStrength=strong when rank=1 and high mention share", () => {
    const results = Array.from({ length: 8 }, () =>
      makeResult({ brandMentioned: true, positionScore: 1, competitors: [] as unknown as QueryResult["competitors"] })
    )
    const pos = calculateCompetitivePosition(results, ["rarely-mentioned.ru"])

    expect(pos.positioningStrength).toBe("strong")
  })

  it("returns positioningStrength=weak when brand rarely mentioned", () => {
    const results = [
      makeResult({ brandMentioned: true,  competitors: ["comp1.ru", "comp2.ru"] as unknown as QueryResult["competitors"] }),
      ...Array.from({ length: 5 }, () =>
        makeResult({ brandMentioned: false, competitors: ["comp1.ru"] as unknown as QueryResult["competitors"] })
      ),
    ]
    const pos = calculateCompetitivePosition(results, ["comp1.ru", "comp2.ru"])

    expect(["weak", "competitive"]).toContain(pos.positioningStrength)
  })

  it("handles empty results gracefully", () => {
    const pos = calculateCompetitivePosition([], ["comp.ru"])
    expect(pos.rank).toBeGreaterThan(0)
    expect(pos.mentionShare).toBe(0)
    expect(pos.firstMentionRate).toBe(0)
  })

  it("handles empty competitors list", () => {
    const results = [
      makeResult({ brandMentioned: true, positionScore: 1, competitors: [] as unknown as QueryResult["competitors"] }),
    ]
    const pos = calculateCompetitivePosition(results, [])

    expect(pos.rank).toBe(1)
    expect(pos.totalParticipants).toBe(1)
    expect(pos.mentionShare).toBe(100)
  })

  it("includes competitor rankings sorted by mention count", () => {
    const results = [
      makeResult({ brandMentioned: false, competitors: ["comp-a.ru", "comp-b.ru"] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: ["comp-a.ru"] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: true,  competitors: [] as unknown as QueryResult["competitors"] }),
    ]
    const pos = calculateCompetitivePosition(results, ["comp-a.ru", "comp-b.ru"])

    const compA = pos.competitors.find((c) => c.name === "comp-a.ru")
    const compB = pos.competitors.find((c) => c.name === "comp-b.ru")
    expect(compA?.mentionCount).toBe(2)
    expect(compB?.mentionCount).toBe(1)
    // comp-a.ru first in sorted list
    expect(pos.competitors[0]?.name).toBe("comp-a.ru")
  })
})
