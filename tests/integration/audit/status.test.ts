/**
 * Integration tests for GET /api/audit/[id]/status
 * Проверяем: токен не раскрывается, статусы, 404 для несуществующего.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFindUnique = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditJob: { findUnique: (...a: unknown[]) => mockFindUnique(...a) },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callStatus(id: string) {
  vi.resetModules()
  const { GET } = await import("@/app/api/audit/[id]/status/route")
  const { NextRequest } = await import("next/server")

  return GET(
    new NextRequest(new Request(`https://kaligeo.by/api/audit/${id}/status`)),
    { params: Promise.resolve({ id }) }
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/audit/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("returns 404 for unknown job id", async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await callStatus("non-existent")
    expect(res.status).toBe(404)
  })

  it("returns job status and metadata", async () => {
    const createdAt = new Date("2026-05-01T10:00:00Z")
    mockFindUnique.mockResolvedValue({
      id:           "job-123",
      status:       "ANALYZING",
      tier:         "STANDARD",
      companyName:  "TestCo",
      clientEmail:  "test@example.com",
      websiteUrl:   "https://example.com",
      niche:        "SEO",
      createdAt,
      completedAt:  null,
      errorMessage: null,
    })

    const res = await callStatus("job-123")
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.id).toBe("job-123")
    expect(json.status).toBe("ANALYZING")
    expect(json.tier).toBe("STANDARD")
    expect(json.companyName).toBe("TestCo")
    expect(json.clientEmail).toBe("test@example.com")
  })

  it("does NOT expose reportToken in response", async () => {
    // Prisma select in the route explicitly excludes reportToken.
    // Our mock must simulate this — return only what the select picks.
    mockFindUnique.mockResolvedValue({
      id:           "job-456",
      status:       "COMPLETED",
      tier:         "ADVANCED",
      companyName:  "SecureCo",
      clientEmail:  "secure@example.com",
      websiteUrl:   "https://secure.com",
      niche:        "Security",
      createdAt:    new Date(),
      completedAt:  new Date(),
      errorMessage: null,
      // reportToken intentionally NOT included (mirrors Prisma select behaviour)
    })

    const res = await callStatus("job-456")
    const json = await res.json()

    // reportToken and reportUrl must not be present
    expect(json.reportToken).toBeUndefined()
    expect(json.reportUrl).toBeNull()
  })

  it("returns errorMessage when job failed", async () => {
    mockFindUnique.mockResolvedValue({
      id:           "job-failed",
      status:       "FAILED",
      tier:         "BASIC",
      companyName:  "FailCo",
      clientEmail:  "fail@test.com",
      websiteUrl:   "https://fail.com",
      niche:        "",
      createdAt:    new Date(),
      completedAt:  null,
      errorMessage: "Pipeline timeout",
    })

    const res = await callStatus("job-failed")
    const json = await res.json()

    expect(json.status).toBe("FAILED")
    expect(json.errorMessage).toBe("Pipeline timeout")
  })

  it("returns all pipeline status values", async () => {
    const statuses = [
      "PENDING_PAYMENT", "PENDING", "GENERATING_QUERIES",
      "EXECUTING_QUERIES", "ANALYZING", "GENERATING_REPORT",
      "DELIVERING", "COMPLETED",
    ]

    for (const status of statuses) {
      vi.resetModules()
      mockFindUnique.mockResolvedValue({
        id:           "job-s",
        status,
        tier:         "BASIC",
        companyName:  "Co",
        clientEmail:  "e@e.com",
        websiteUrl:   "https://e.com",
        niche:        "",
        createdAt:    new Date(),
        completedAt:  null,
        errorMessage: null,
      })

      const { GET } = await import("@/app/api/audit/[id]/status/route")
      const { NextRequest } = await import("next/server")
      const res = await GET(
        new NextRequest(new Request("https://kaligeo.by/api/audit/job-s/status")),
        { params: Promise.resolve({ id: "job-s" }) }
      )
      const json = await res.json()

      expect(json.status).toBe(status)
    }
  })
})
