/**
 * Integration tests for POST /api/freemium/scan
 *
 * Проверяем: кэш по URL, rate limiting, fallback при ошибке агента.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFindFirst = vi.fn()
const mockCreate    = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    freemiumScan: {
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
      create:    (...a: unknown[]) => mockCreate(...a),
    },
  },
}))

const mockWebsiteAnalysis = vi.fn()
vi.mock("@/lib/agents/website-analysis-agent", () => ({
  runWebsiteAnalysisAgent: (...a: unknown[]) => mockWebsiteAnalysis(...a),
}))

const mockCheckRateLimit = vi.fn().mockResolvedValue(true)
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const defaultAnalysis = {
  companyName:          "TestCo",
  niche:                "SEO-сервисы для бизнеса",
  description:          "Платформа для анализа",
  services:             ["Аудит", "Отчёт", "Мониторинг"],
  targetAudience:       "B2B",
  keywords:             ["SEO", "AI", "видимость", "бренд", "аудит"],
  suggestedCompetitors: ["seowork.ru"],
}

async function callScan(body: object, ip = "1.1.1.1") {
  vi.resetModules()
  const { POST } = await import("@/app/api/freemium/scan/route")
  const { NextRequest } = await import("next/server")

  return POST(new NextRequest(new Request("https://kaligeo.by/api/freemium/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/freemium/scan", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockCheckRateLimit.mockResolvedValue(true)
    mockFindFirst.mockResolvedValue(null)    // no cached scan by default
    mockWebsiteAnalysis.mockResolvedValue(defaultAnalysis)
    mockCreate.mockResolvedValue({ id: "scan-new-123" })
  })

  it("returns 400 for invalid websiteUrl", async () => {
    const res = await callScan({ websiteUrl: "not-a-url" })
    expect(res.status).toBe(400)
    expect(mockWebsiteAnalysis).not.toHaveBeenCalled()
  })

  it("returns 400 for missing websiteUrl", async () => {
    const res = await callScan({})
    expect(res.status).toBe(400)
  })

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const res = await callScan({ websiteUrl: "https://example.com" })
    expect(res.status).toBe(429)
  })

  it("returns cached scanId when recent scan exists for same URL", async () => {
    mockFindFirst.mockResolvedValue({ id: "cached-scan-789" })

    const res = await callScan({ websiteUrl: "https://example.com" })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.scanId).toBe("cached-scan-789")
    expect(mockWebsiteAnalysis).not.toHaveBeenCalled()  // no analysis needed
  })

  it("runs website analysis for new URL and returns scanId", async () => {
    const res = await callScan({ websiteUrl: "https://newsite.com" })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.scanId).toBe("scan-new-123")
    expect(mockWebsiteAnalysis).toHaveBeenCalledWith("https://newsite.com")
  })

  it("falls back gracefully when analysis agent fails", async () => {
    mockWebsiteAnalysis.mockRejectedValue(new Error("Agent timeout"))

    const res = await callScan({ websiteUrl: "https://broken.com" })
    const json = await res.json()

    // Should still succeed with fallback empty analysis
    expect(res.status).toBe(200)
    expect(json.scanId).toBeDefined()
    expect(mockCreate).toHaveBeenCalled()
  })

  it("preview score is always ≤ 42 (to show room for improvement)", async () => {
    // Even with ideal analysis, score capped at 42
    mockWebsiteAnalysis.mockResolvedValue({
      ...defaultAnalysis,
      niche:    "AI-driven автоматизация и нейро-оптимизация",
      services: ["s1", "s2", "s3", "s4", "s5"],
      keywords: ["k1", "k2", "k3", "k4", "k5", "k6"],
    })
    mockCreate.mockImplementation(async ({ data }) => {
      expect(data.previewScore).toBeLessThanOrEqual(42)
      return { id: "scan-cap-test" }
    })

    await callScan({ websiteUrl: "https://perfect.com" })
  })

  it("passes source to DB if provided", async () => {
    await callScan({ websiteUrl: "https://example.com", source: "telegram" })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ source: "telegram" }),
      })
    )
  })

  it("uses per-IP rate limit key", async () => {
    await callScan({ websiteUrl: "https://example.com" }, "9.8.7.6")

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("9.8.7.6"),
      expect.any(Number),
      expect.any(Number)
    )
  })
})
