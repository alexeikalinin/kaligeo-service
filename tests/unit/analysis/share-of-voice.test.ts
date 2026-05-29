import { describe, it, expect } from "vitest"
import { calculateShareOfVoice } from "@/lib/analysis/share-of-voice"
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

describe("calculateShareOfVoice", () => {
  it("returns 0 overall SoV when no mentions", () => {
    const results = [
      makeResult({ brandMentioned: false, competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: [] as unknown as QueryResult["competitors"] }),
    ]
    const sov = calculateShareOfVoice(results, "KaliGEO", ["seowork.ru"])
    expect(sov.overall).toBe(0)
  })

  it("returns 100 SoV when only brand mentioned, no competitors", () => {
    const results = [
      makeResult({ brandMentioned: true, competitors: [] as unknown as QueryResult["competitors"] }),
    ]
    const sov = calculateShareOfVoice(results, "KaliGEO", ["seowork.ru"])
    expect(sov.overall).toBe(100)
  })

  it("splits SoV 50/50 with equal brand and competitor mentions", () => {
    const results = [
      makeResult({ brandMentioned: true,  competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: ["seowork.ru"] as unknown as QueryResult["competitors"] }),
    ]
    const sov = calculateShareOfVoice(results, "KaliGEO", ["seowork.ru"])
    expect(sov.overall).toBe(50)
  })

  it("correctly calculates 33% SoV for brand vs 2 competitors", () => {
    const results = [
      makeResult({ brandMentioned: true,  competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: ["comp1.ru"] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: ["comp2.ru"] as unknown as QueryResult["competitors"] }),
    ]
    const sov = calculateShareOfVoice(results, "KaliGEO", ["comp1.ru", "comp2.ru"])
    expect(sov.overall).toBe(33)
  })

  it("calculates SoV by platform", () => {
    const results = [
      makeResult({ platform: "CHATGPT", brandMentioned: true,  competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ platform: "CHATGPT", brandMentioned: false, competitors: ["seowork.ru"] as unknown as QueryResult["competitors"] }),
      makeResult({ platform: "GEMINI",  brandMentioned: true,  competitors: [] as unknown as QueryResult["competitors"] }),
    ]
    const sov = calculateShareOfVoice(results, "KaliGEO", ["seowork.ru"])

    expect(sov.byPlatform["CHATGPT"]).toBe(50)  // 1 brand / (1+1 comp)
    expect(sov.byPlatform["GEMINI"]).toBe(100)  // brand only
  })

  it("classifies recommendation queries correctly", () => {
    const results = [
      makeResult({ query: "лучший SEO сервис",  brandMentioned: true,  competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ query: "топ инструментов",    brandMentioned: false, competitors: ["comp.ru"] as unknown as QueryResult["competitors"] }),
    ]
    const sov = calculateShareOfVoice(results, "KaliGEO", ["comp.ru"])

    expect(sov.byQueryCategory["recommendation"]).toBeDefined()
    // 1 brand mention out of 2 total mentions = 50%
    expect(sov.byQueryCategory["recommendation"]).toBe(50)
  })

  it("mentionShare.brand reflects brand's SoV percentage", () => {
    // brand: 2 mentions, competitor: 2 mentions → brand SoV = 2/(2+2)*100 = 50%
    const results = [
      makeResult({ brandMentioned: true,  competitors: [] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: true,  competitors: ["seowork.ru"] as unknown as QueryResult["competitors"] }),
      makeResult({ brandMentioned: false, competitors: ["seowork.ru"] as unknown as QueryResult["competitors"] }),
    ]
    const sov = calculateShareOfVoice(results, "KaliGEO", ["seowork.ru"])

    // mentionShare stores percentages (SoV), not raw counts
    expect(sov.mentionShare.brand).toBe(50)   // brand SoV %
    expect(typeof sov.mentionShare.competitors["seowork.ru"]).toBe("number")
  })

  it("handles empty results gracefully", () => {
    const sov = calculateShareOfVoice([], "KaliGEO", ["seowork.ru"])
    expect(sov.overall).toBe(0)
    expect(sov.mentionShare.brand).toBe(0)
  })

  it("handles empty competitors list", () => {
    const results = [
      makeResult({ brandMentioned: true, competitors: [] as unknown as QueryResult["competitors"] }),
    ]
    const sov = calculateShareOfVoice(results, "KaliGEO", [])
    expect(sov.overall).toBe(100)
  })
})
