import { describe, it, expect } from "vitest"
import {
  getDomainAuthority,
  scoreSourceQuality,
  topTrustedSources,
  averageSourceTrust,
} from "@/lib/analysis/source-quality"

// ── getDomainAuthority ────────────────────────────────────────────────────────

describe("getDomainAuthority", () => {
  it("returns high score for wikipedia.org", () => {
    expect(getDomainAuthority("wikipedia.org")).toBe(95)
  })

  it("returns high score for rbc.ru", () => {
    expect(getDomainAuthority("rbc.ru")).toBe(87)
  })

  it("returns score for habr.com", () => {
    expect(getDomainAuthority("habr.com")).toBe(82)
  })

  it("strips www. prefix before lookup", () => {
    expect(getDomainAuthority("www.wikipedia.org")).toBe(getDomainAuthority("wikipedia.org"))
  })

  it("returns score for subdomain via suffix match", () => {
    // news.vc.ru should match vc.ru pattern
    const base = getDomainAuthority("vc.ru")
    const sub = getDomainAuthority("news.vc.ru")
    expect(sub).toBe(base)
  })

  it("returns high score for .gov TLD", () => {
    expect(getDomainAuthority("mos.gov")).toBeGreaterThanOrEqual(80)
  })

  it("returns reasonable default for unknown domain", () => {
    const score = getDomainAuthority("some-obscure-blog-xyz123.com")
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(70)
  })

  it("returns lower score for social platforms", () => {
    const vk = getDomainAuthority("vk.com")
    const wiki = getDomainAuthority("wikipedia.org")
    expect(vk).toBeLessThan(wiki)
  })
})

// ── scoreSourceQuality ────────────────────────────────────────────────────────

describe("scoreSourceQuality", () => {
  it("returns empty array for empty input", () => {
    expect(scoreSourceQuality([])).toEqual([])
  })

  it("parses URL and scores correctly", () => {
    const results = scoreSourceQuality(["https://wikipedia.org/wiki/SEO"])
    expect(results).toHaveLength(1)
    expect(results[0].domain).toBe("wikipedia.org")
    expect(results[0].authority).toBe(95)
    expect(results[0].trustIndex).toBe(95)
  })

  it("handles URLs without http prefix", () => {
    const results = scoreSourceQuality(["habr.com/article"])
    expect(results).toHaveLength(1)
    expect(results[0].domain).toBe("habr.com")
  })

  it("skips truly malformed URLs (with spaces) silently", () => {
    // URLs with spaces cannot be parsed by new URL() even with https:// prefix
    const results = scoreSourceQuality(["not a url with spaces"])
    expect(results).toHaveLength(0)
  })

  it("strips www from domain", () => {
    const results = scoreSourceQuality(["https://www.habr.com/post"])
    expect(results[0].domain).toBe("habr.com")
  })

  it("processes multiple URLs", () => {
    const urls = ["https://wikipedia.org", "https://vk.com", "https://rbc.ru"]
    const results = scoreSourceQuality(urls)
    expect(results).toHaveLength(3)
  })
})

// ── topTrustedSources ─────────────────────────────────────────────────────────

describe("topTrustedSources", () => {
  it("returns top N sorted by trustIndex", () => {
    const urls = [
      "https://vk.com",       // low ~45
      "https://wikipedia.org", // high 95
      "https://habr.com",     // high 82
      "https://rbc.ru",       // high 87
      "https://t.me",         // low ~42
    ]

    const top3 = topTrustedSources(urls, 3)
    expect(top3).toHaveLength(3)
    expect(top3[0].domain).toBe("wikipedia.org")   // highest authority
    expect(top3[1].domain).toBe("rbc.ru")
    expect(top3[2].domain).toBe("habr.com")
  })

  it("returns all entries when n > total count", () => {
    const urls = ["https://wikipedia.org", "https://habr.com"]
    const top10 = topTrustedSources(urls, 10)
    expect(top10).toHaveLength(2)
  })

  it("returns empty array for empty input", () => {
    expect(topTrustedSources([], 5)).toEqual([])
  })

  it("defaults n to 5", () => {
    const urls = Array.from({ length: 10 }, (_, i) => `https://domain${i}.org`)
    const top = topTrustedSources(urls)
    expect(top).toHaveLength(5)
  })
})

// ── averageSourceTrust ────────────────────────────────────────────────────────

describe("averageSourceTrust", () => {
  it("returns 0 for empty input", () => {
    expect(averageSourceTrust([])).toBe(0)
  })

  it("returns authority for single high-quality source", () => {
    expect(averageSourceTrust(["https://wikipedia.org"])).toBe(95)
  })

  it("averages multiple sources", () => {
    const avg = averageSourceTrust(["https://wikipedia.org", "https://vk.com"])
    // wiki=95, vk=45, avg=(95+45)/2=70
    expect(avg).toBe(70)
  })
})
