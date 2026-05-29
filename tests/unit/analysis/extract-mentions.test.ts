import { describe, it, expect } from "vitest"
import { extractMentions, detectPositionScore, categorizeDomain } from "@/lib/analysis/extract-mentions"

// ── extractMentions ───────────────────────────────────────────────────────────

describe("extractMentions", () => {
  const website = "https://kaligeo.ru"
  const competitors = ["seowork.ru", "topvisor.com"]

  it("detects brand mention by company name", () => {
    const result = extractMentions(
      "KaliGEO — отличный сервис для SEO-аудита.",
      "KaliGEO",
      website,
      competitors,
    )
    expect(result.brandMentioned).toBe(true)
    expect(result.sentiment).not.toBe("absent")
  })

  it("detects brand mention by domain", () => {
    const result = extractMentions(
      "Посетите kaligeo.ru для детального анализа.",
      "NoMatchCompany",
      website,
      competitors,
    )
    expect(result.brandMentioned).toBe(true)
  })

  it("returns brandMentioned=false when brand is absent", () => {
    const result = extractMentions(
      "Рекомендуем использовать seowork для оптимизации.",
      "KaliGEO",
      website,
      competitors,
    )
    expect(result.brandMentioned).toBe(false)
    expect(result.sentiment).toBe("absent")
    expect(result.positionScore).toBe(0)
  })

  it("detects competitors in response", () => {
    const result = extractMentions(
      "В числе лидеров — seowork.ru и topvisor.com.",
      "KaliGEO",
      website,
      competitors,
    )
    expect(result.competitors).toContain("seowork.ru")
    expect(result.competitors).toContain("topvisor.com")
  })

  it("returns no competitors when none mentioned", () => {
    const result = extractMentions(
      "KaliGEO — лучшее решение.",
      "KaliGEO",
      website,
      competitors,
    )
    expect(result.competitors).toHaveLength(0)
  })

  it("assigns positive sentiment for positive words", () => {
    const result = extractMentions(
      "KaliGEO — лучший и рекомендуемый сервис.",
      "KaliGEO",
      website,
      [],
    )
    expect(result.sentiment).toBe("positive")
  })

  it("assigns negative sentiment for negative words", () => {
    const result = extractMentions(
      "KaliGEO — плохой и очень медленный сервис. Жалоба в поддержку.",
      "KaliGEO",
      website,
      [],
    )
    expect(result.sentiment).toBe("negative")
  })

  it("assigns neutral sentiment when no strong words", () => {
    const result = extractMentions(
      "KaliGEO предоставляет услуги аудита.",
      "KaliGEO",
      website,
      [],
    )
    expect(result.sentiment).toBe("neutral")
  })

  it("extracts URLs from response", () => {
    const result = extractMentions(
      "Подробнее на https://kaligeo.ru/blog и https://habr.com/article",
      "KaliGEO",
      website,
      [],
    )
    expect(result.sources).toContain("https://kaligeo.ru/blog")
    expect(result.sources).toContain("https://habr.com/article")
  })

  it("prefers citationsFromApi over regex when provided", () => {
    const apiCitations = ["https://kaligeo.ru/official"]
    const result = extractMentions(
      "KaliGEO — https://some-random.com",
      "KaliGEO",
      website,
      [],
      apiCitations,
    )
    expect(result.sources).toEqual(apiCitations)
    expect(result.sources).not.toContain("https://some-random.com")
  })

  it("categorizes official domain correctly", () => {
    const result = extractMentions(
      "KaliGEO — посетите https://kaligeo.ru",
      "KaliGEO",
      website,
      [],
    )
    expect(result.sourceCategories.official).toContain("https://kaligeo.ru")
  })

  it("categorizes competitor domain correctly", () => {
    const result = extractMentions(
      "KaliGEO упоминается. Также https://seowork.ru является конкурентом.",
      "KaliGEO",
      website,
      competitors,
    )
    expect(result.sourceCategories.competitor).toContain("https://seowork.ru")
  })

  it("deduplicates sources", () => {
    const result = extractMentions(
      "KaliGEO: https://kaligeo.ru https://kaligeo.ru",
      "KaliGEO",
      website,
      [],
    )
    expect(result.sources.filter((s) => s === "https://kaligeo.ru")).toHaveLength(1)
  })
})

// ── detectPositionScore ───────────────────────────────────────────────────────

describe("detectPositionScore", () => {
  it("returns 0 when brand not in response", () => {
    expect(detectPositionScore("Это ответ без упоминания бренда.", "KaliGEO")).toBe(0)
  })

  it("returns 1 when brand is first numbered list item", () => {
    const response = "Лучшие сервисы:\n1. KaliGEO — лидер\n2. Другой сервис"
    expect(detectPositionScore(response, "KaliGEO")).toBe(1)
  })

  it("returns 1 when brand appears in first 15% of response", () => {
    const brand = "KaliGEO"
    const response = brand + " " + "x".repeat(200)
    expect(detectPositionScore(response, brand)).toBe(1)
  })

  it("returns 2 for early mention (15–33%)", () => {
    const prefix = "x".repeat(100)
    const response = prefix + " KaliGEO " + "y".repeat(300)
    const result = detectPositionScore(response, "KaliGEO")
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBeLessThanOrEqual(3)
  })

  it("returns 4 for very late mention", () => {
    const prefix = "z".repeat(1000)
    const response = prefix + " KaliGEO"
    expect(detectPositionScore(response, "KaliGEO")).toBe(4)
  })
})

// ── categorizeDomain ──────────────────────────────────────────────────────────

describe("categorizeDomain", () => {
  it("classifies own domain as official", () => {
    expect(categorizeDomain("https://kaligeo.ru/page", "https://kaligeo.ru", [])).toBe("official")
  })

  it("classifies competitor domain as competitor", () => {
    expect(categorizeDomain("https://seowork.ru/blog", "https://kaligeo.ru", ["seowork.ru"])).toBe("competitor")
  })

  it("classifies wikipedia as media", () => {
    expect(categorizeDomain("https://wikipedia.org/wiki/SEO", "https://kaligeo.ru", [])).toBe("media")
  })

  it("classifies vc.ru as media", () => {
    expect(categorizeDomain("https://vc.ru/marketing/article", "https://kaligeo.ru", [])).toBe("media")
  })

  it("classifies 2gis as catalog", () => {
    expect(categorizeDomain("https://2gis.ru/company", "https://kaligeo.ru", [])).toBe("catalog")
  })

  it("classifies vk.com as social", () => {
    expect(categorizeDomain("https://vk.com/kaligeo", "https://kaligeo.ru", [])).toBe("social")
  })

  it("classifies unknown domain as expert", () => {
    expect(categorizeDomain("https://myblog.example.com/post", "https://kaligeo.ru", [])).toBe("expert")
  })

  it("handles malformed URL gracefully", () => {
    expect(() => categorizeDomain("not-a-url", "https://kaligeo.ru", [])).not.toThrow()
  })
})
