/**
 * Integration tests for POST /api/audit/submit
 *
 * Мокируем: Prisma, Upstash Redis (rate limit), уведомления.
 * Проверяем: валидацию, создание джоба, rate limiting.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockClientUpsert = vi.fn()
const mockJobCreate    = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client:   { upsert: (...a: unknown[]) => mockClientUpsert(...a) },
    auditJob: { create: (...a: unknown[]) => mockJobCreate(...a) },
  },
}))

vi.mock("@/lib/notify", () => ({
  notifyNewAuditRequest: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/cors", () => ({
  getCorsHeaders: vi.fn().mockReturnValue({}),
  corsOptionsResponse: vi.fn(),
}))

// vi.fn().mockImplementation(arrowFn) is NOT a constructor — must use a function declaration
// vi.hoisted ensures the mocks are available inside the factory
const mockRedisIncr   = vi.hoisted(() => vi.fn().mockResolvedValue(1))
const mockRedisExpire = vi.hoisted(() => vi.fn().mockResolvedValue(1))

vi.mock("@upstash/redis", () => {
  function RedisMock(this: Record<string, unknown>) {
    this.incr   = mockRedisIncr
    this.expire = mockRedisExpire
  }
  return { Redis: RedisMock }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callSubmit(body: object, ip = "1.2.3.4") {
  const { POST } = await import("@/app/api/audit/submit/route")
  const { NextRequest } = await import("next/server")

  return POST(new NextRequest(new Request("https://kaligeo.by/api/audit/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })))
}

const validBody = {
  clientEmail: "test@example.com",
  websiteUrl:  "https://example.com",
  companyName: "TestCo",
  niche:       "SEO-сервисы",
  competitors: ["seowork.ru"],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/audit/submit", () => {
  beforeEach(() => {
    // Точечный сброс — vi.clearAllMocks() затрагивает Redis.mockImplementation
    mockClientUpsert.mockClear()
    mockJobCreate.mockClear()
    mockRedisIncr.mockResolvedValue(1)   // reset to "first request" → allowed

    mockClientUpsert.mockResolvedValue({ id: "client-1", clientNumber: 42 })
    mockJobCreate.mockResolvedValue({ id: "job-new-123" })

    // Восстановить env var, если предыдущий тест его удалил
    process.env.UPSTASH_REDIS_REST_URL   = "https://test-redis.upstash.io"
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token"
  })

  it("returns 200 with jobId for valid request", async () => {
    const res = await callSubmit(validBody)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.jobId).toBe("job-new-123")
  })

  it("creates job with tier=BASIC regardless of input", async () => {
    await callSubmit({ ...validBody, tier: "ADVANCED" })

    expect(mockJobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: "BASIC" }),
      })
    )
  })

  it("creates job with PENDING_PAYMENT status", async () => {
    await callSubmit(validBody)

    expect(mockJobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING_PAYMENT" }),
      })
    )
  })

  it("normalises email to lowercase", async () => {
    await callSubmit({ ...validBody, clientEmail: "UPPER@EXAMPLE.COM" })

    expect(mockClientUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "upper@example.com" } })
    )
  })

  it("returns 400 for invalid email", async () => {
    const res = await callSubmit({ ...validBody, clientEmail: "not-an-email" })
    expect(res.status).toBe(400)
    expect(mockJobCreate).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid websiteUrl", async () => {
    const res = await callSubmit({ ...validBody, websiteUrl: "not-a-url" })
    expect(res.status).toBe(400)
    expect(mockJobCreate).not.toHaveBeenCalled()
  })

  it("returns 400 for empty companyName", async () => {
    const res = await callSubmit({ ...validBody, companyName: "" })
    expect(res.status).toBe(400)
  })

  it("returns 400 for missing required fields", async () => {
    const res = await callSubmit({ clientEmail: "test@test.com" })
    expect(res.status).toBe(400)
  })

  it("passes competitors array to job", async () => {
    await callSubmit({ ...validBody, competitors: ["comp1.ru", "comp2.ru"] })

    expect(mockJobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ competitors: ["comp1.ru", "comp2.ru"] }),
      })
    )
  })

  it("returns 429 when rate limit exceeded (Redis incr > 3)", async () => {
    mockRedisIncr.mockResolvedValue(4)   // simulate 4th request → exceeds RATE_LIMIT=3

    const res = await callSubmit(validBody)
    expect(res.status).toBe(429)
    expect(mockJobCreate).not.toHaveBeenCalled()
  })

  it("allows request when Redis unavailable (graceful degradation)", async () => {
    // Without UPSTASH_REDIS_REST_URL, rate limit is skipped
    delete process.env.UPSTASH_REDIS_REST_URL

    const res = await callSubmit(validBody)
    expect(res.status).toBe(200)
  })

  it("handles optional fields: source, baselineJobId", async () => {
    await callSubmit({ ...validBody, source: "telegram", baselineJobId: "prev-job-id" })

    expect(mockJobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          source: "telegram",
          baselineJobId: "prev-job-id",
        }),
      })
    )
  })
})
