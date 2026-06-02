/**
 * Tests for client auth routes:
 *   POST /api/client/auth/magic-link
 *   GET  /api/client/auth/verify
 *   POST /api/client/auth/trial
 *   POST /api/client/auth/logout
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockClientFindUnique   = vi.fn()
const mockClientCreate       = vi.fn()
const mockClientUpdate       = vi.fn()
const mockTokenCreate        = vi.fn()
const mockTokenUpdateMany    = vi.fn()
const mockTokenFindUnique    = vi.fn()
const mockJobCreate          = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findUnique:  (...a: unknown[]) => mockClientFindUnique(...a),
      create:      (...a: unknown[]) => mockClientCreate(...a),
      update:      (...a: unknown[]) => mockClientUpdate(...a),
    },
    magicLinkToken: {
      create:      (...a: unknown[]) => mockTokenCreate(...a),
      updateMany:  (...a: unknown[]) => mockTokenUpdateMany(...a),
      findUnique:  (...a: unknown[]) => mockTokenFindUnique(...a),
      update:      vi.fn().mockResolvedValue({}),
    },
    auditJob: {
      create: (...a: unknown[]) => mockJobCreate(...a),
    },
  },
}))

const mockCheckRateLimit = vi.fn().mockResolvedValue(true)
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}))

const mockSendMagicLinkEmail = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/notify", () => ({
  sendMagicLinkEmail: (...a: unknown[]) => mockSendMagicLinkEmail(...a),
  notifyAuditStarted: vi.fn().mockResolvedValue(undefined),
}))

const mockTasksTrigger = vi.fn().mockResolvedValue({ id: "run-1" })
vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger: (...a: unknown[]) => mockTasksTrigger(...a) },
}))
vi.mock("@/trigger/audit-pipeline", () => ({ auditPipeline: {} }))

vi.mock("@/lib/client-session", () => ({
  signSession: vi.fn().mockReturnValue("signed-session-value"),
  sessionCookieOptions: vi.fn().mockReturnValue({
    name: "client_session",
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 2592000,
    path: "/",
  }),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callMagicLink(body: object, ip = "1.2.3.4") {
  vi.resetModules()
  const { POST } = await import("@/app/api/client/auth/magic-link/route")
  const req = new Request("http://localhost/api/client/auth/magic-link", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })
  return POST(req as never)
}

async function callVerify(token: string) {
  vi.resetModules()
  const { GET } = await import("@/app/api/client/auth/verify/route")
  const { NextRequest } = await import("next/server")
  const url = `http://localhost/api/client/auth/verify${token ? `?token=${token}` : ""}`
  return GET(new NextRequest(new Request(url)))
}

async function callTrial(body: object) {
  vi.resetModules()
  const { POST } = await import("@/app/api/client/auth/trial/route")
  const req = new Request("http://localhost/api/client/auth/trial", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  return POST(req as never)
}

async function callLogout() {
  vi.resetModules()
  const { POST } = await import("@/app/api/client/auth/logout/route")
  const req = new Request("http://localhost/api/client/auth/logout", { method: "POST" })
  return POST(req as never)
}

// ── magic-link ────────────────────────────────────────────────────────────────

describe("POST /api/client/auth/magic-link", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue(true)
    mockClientFindUnique.mockResolvedValue(null)
    mockClientCreate.mockResolvedValue({ id: "client-1", email: "user@example.com" })
    mockTokenUpdateMany.mockResolvedValue({})
    mockTokenCreate.mockResolvedValue({ token: "abc123" })
  })

  it("returns 200 and sends email for valid new user", async () => {
    const res = await callMagicLink({ email: "user@example.com" })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockSendMagicLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com" })
    )
  })

  it("normalises email to lowercase", async () => {
    await callMagicLink({ email: "User@EXAMPLE.COM" })
    expect(mockClientFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "user@example.com" } })
    )
  })

  it("reuses existing client and does not create new one", async () => {
    mockClientFindUnique.mockResolvedValue({ id: "existing-1", email: "user@example.com" })
    await callMagicLink({ email: "user@example.com" })
    expect(mockClientCreate).not.toHaveBeenCalled()
    expect(mockTokenCreate).toHaveBeenCalled()
  })

  it("invalidates old unused tokens before creating new one", async () => {
    await callMagicLink({ email: "user@example.com" })
    expect(mockTokenUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: "user@example.com", usedAt: null } })
    )
    expect(mockTokenCreate).toHaveBeenCalledAfter?.(mockTokenUpdateMany) // order matters
  })

  it("returns 400 for invalid email", async () => {
    const res = await callMagicLink({ email: "not-an-email" })
    expect(res.status).toBe(400)
  })

  it("returns 400 for missing email", async () => {
    const res = await callMagicLink({})
    expect(res.status).toBe(400)
  })

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const res = await callMagicLink({ email: "user@example.com" })
    expect(res.status).toBe(429)
    expect(mockSendMagicLinkEmail).not.toHaveBeenCalled()
  })

  it("uses per-IP rate limit key", async () => {
    await callMagicLink({ email: "user@example.com" }, "10.0.0.1")
    expect(mockCheckRateLimit).toHaveBeenCalledWith("rl:magic:10.0.0.1", 3, 300)
  })
})

// ── verify ────────────────────────────────────────────────────────────────────

describe("GET /api/client/auth/verify", () => {
  const futureDate = new Date(Date.now() + 10 * 60 * 1000)

  beforeEach(() => {
    vi.clearAllMocks()
    mockTokenFindUnique.mockResolvedValue({
      id: "tok-1",
      token: "valid-token",
      email: "user@example.com",
      usedAt: null,
      expiresAt: futureDate,
    })
    mockClientFindUnique.mockResolvedValue({ id: "client-1", email: "user@example.com" })
  })

  it("redirects to /my/dashboard on valid token", async () => {
    const res = await callVerify("valid-token")
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("/my/dashboard")
  })

  it("sets client_session cookie on success", async () => {
    const res = await callVerify("valid-token")
    const setCookie = res.headers.get("set-cookie")
    expect(setCookie).toContain("client_session")
  })

  it("redirects to /my/login?error=invalid when no token param", async () => {
    const res = await callVerify("")
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("error=invalid")
  })

  it("redirects to /my/login?error=expired when token not found", async () => {
    mockTokenFindUnique.mockResolvedValue(null)
    const res = await callVerify("unknown-token")
    expect(res.status).toBe(307)
    expect(res.headers.get("location")).toContain("error=expired")
  })

  it("redirects to /my/login?error=expired when token already used", async () => {
    mockTokenFindUnique.mockResolvedValue({
      id: "tok-1",
      token: "used-token",
      email: "user@example.com",
      usedAt: new Date(),
      expiresAt: futureDate,
    })
    const res = await callVerify("used-token")
    expect(res.headers.get("location")).toContain("error=expired")
  })

  it("redirects to /my/login?error=expired when token expired", async () => {
    mockTokenFindUnique.mockResolvedValue({
      id: "tok-1",
      token: "old-token",
      email: "user@example.com",
      usedAt: null,
      expiresAt: new Date(Date.now() - 1000),
    })
    const res = await callVerify("old-token")
    expect(res.headers.get("location")).toContain("error=expired")
  })

  it("redirects to /my/login?error=invalid when client not found", async () => {
    mockClientFindUnique.mockResolvedValue(null)
    const res = await callVerify("valid-token")
    expect(res.headers.get("location")).toContain("error=invalid")
  })
})

// ── trial ─────────────────────────────────────────────────────────────────────

const validTrialBody = {
  email: "trial@example.com",
  companyName: "Test Co",
  websiteUrl: "https://example.com",
  niche: "software",
  competitors: ["Competitor A"],
}

describe("POST /api/client/auth/trial", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockClientFindUnique.mockResolvedValue(null)
    mockClientCreate.mockResolvedValue({ id: "client-1", email: "trial@example.com", trialUsed: false })
    mockClientUpdate.mockResolvedValue({})
    mockJobCreate.mockResolvedValue({ id: "job-1" })
    mockTokenUpdateMany.mockResolvedValue({})
    mockTokenCreate.mockResolvedValue({ token: "magic-xyz" })
  })

  it("returns 200 with jobId and magicLinkUrl for new user", async () => {
    const res = await callTrial(validTrialBody)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.jobId).toBe("job-1")
    expect(json.magicLinkUrl).toContain("magic-xyz")
  })

  it("creates job with tier=BASIC and source=trial", async () => {
    await callTrial(validTrialBody)
    expect(mockJobCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tier: "BASIC", source: "trial" }),
      })
    )
  })

  it("marks client trialUsed=true after creating job", async () => {
    await callTrial(validTrialBody)
    expect(mockClientUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { trialUsed: true } })
    )
  })

  it("triggers audit pipeline", async () => {
    await callTrial(validTrialBody)
    expect(mockTasksTrigger).toHaveBeenCalledWith("audit-pipeline", { jobId: "job-1" })
  })

  it("returns 409 when client already used trial", async () => {
    mockClientFindUnique.mockResolvedValue({ id: "existing-1", email: "trial@example.com", trialUsed: true })
    const res = await callTrial(validTrialBody)
    expect(res.status).toBe(409)
    expect(mockJobCreate).not.toHaveBeenCalled()
  })

  it("returns 400 for invalid email", async () => {
    const res = await callTrial({ ...validTrialBody, email: "bad-email" })
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid websiteUrl", async () => {
    const res = await callTrial({ ...validTrialBody, websiteUrl: "not-a-url" })
    expect(res.status).toBe(400)
  })

  it("returns 400 for empty companyName", async () => {
    const res = await callTrial({ ...validTrialBody, companyName: "" })
    expect(res.status).toBe(400)
  })

  it("creates new client when not found", async () => {
    mockClientFindUnique.mockResolvedValue(null)
    await callTrial(validTrialBody)
    expect(mockClientCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "trial@example.com" }),
      })
    )
  })

  it("reuses existing client if trialUsed=false", async () => {
    mockClientFindUnique.mockResolvedValue({ id: "existing-1", email: "trial@example.com", trialUsed: false })
    await callTrial(validTrialBody)
    expect(mockClientCreate).not.toHaveBeenCalled()
    expect(mockJobCreate).toHaveBeenCalled()
  })
})

// ── logout ────────────────────────────────────────────────────────────────────

describe("POST /api/client/auth/logout", () => {
  it("clears client_session cookie and redirects", async () => {
    const res = await callLogout()
    expect(res.status).toBe(307)
    const setCookie = res.headers.get("set-cookie")
    expect(setCookie).toContain("client_session=")
    expect(setCookie).toMatch(/max-age=0/i)
  })

  it("redirects to /my/login", async () => {
    const res = await callLogout()
    expect(res.headers.get("location")).toContain("/my/login")
  })
})
