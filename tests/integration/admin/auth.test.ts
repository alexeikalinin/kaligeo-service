/**
 * Integration tests for POST /api/admin/auth
 *
 * Критично: rate limiting (5 попыток / 15 мин), не раскрываем пароль.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Rate limiter — по умолчанию разрешает
const mockCheckRateLimit = vi.fn().mockResolvedValue(true)
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}))

// cookies() from next/headers
const mockCookiesSet = vi.fn()
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    set: mockCookiesSet,
    get: vi.fn(),
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callAuth(password: string, ip = "5.5.5.5") {
  vi.resetModules()
  process.env.ADMIN_SESSION_TOKEN = "correct-admin-password"

  const { POST } = await import("@/app/api/admin/auth/route")
  const { NextRequest } = await import("next/server")

  return POST(new NextRequest(new Request("https://kaligeo.by/api/admin/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ password }),
  })))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockCheckRateLimit.mockResolvedValue(true)  // allowed by default
  })

  it("returns 200 and sets cookie for correct password", async () => {
    const res = await callAuth("correct-admin-password")
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockCookiesSet).toHaveBeenCalledWith(
      "admin_session",
      "correct-admin-password",
      expect.objectContaining({ httpOnly: true })
    )
  })

  it("returns 401 for wrong password", async () => {
    const res = await callAuth("wrong-password")
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBeDefined()
    expect(mockCookiesSet).not.toHaveBeenCalled()
  })

  it("returns 401 for empty password", async () => {
    const res = await callAuth("")
    expect(res.status).toBe(401)
  })

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue(false)  // blocked

    const res = await callAuth("any-password")
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toMatch(/попыток|попыт/i)
    expect(mockCookiesSet).not.toHaveBeenCalled()
  })

  it("checks rate limit with correct key format", async () => {
    await callAuth("correct-admin-password", "1.2.3.4")

    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.stringContaining("admin"),   // key must reference admin
      5,                                  // 5 attempts
      expect.any(Number)                  // window seconds
    )
  })

  it("does not expose ADMIN_SESSION_TOKEN value in error response", async () => {
    const res = await callAuth("wrong")
    const json = await res.json()
    const bodyStr = JSON.stringify(json)

    expect(bodyStr).not.toContain("correct-admin-password")
  })

  it("uses different rate limit keys per IP address", async () => {
    // First call from IP A
    await callAuth("wrong", "10.0.0.1")
    const firstCall = mockCheckRateLimit.mock.calls[0]

    vi.clearAllMocks()
    vi.resetModules()
    mockCheckRateLimit.mockResolvedValue(true)

    // Second call from IP B
    await callAuth("wrong", "10.0.0.2")
    const secondCall = mockCheckRateLimit.mock.calls[0]

    expect(firstCall?.[0]).not.toBe(secondCall?.[0])
  })
})
