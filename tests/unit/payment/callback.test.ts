/**
 * Tests for POST /api/payment/callback
 *
 * This route handles Alfa-Bank server-side payment notifications.
 * Critical security: HMAC-SHA256 verification + idempotent processing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { createHmac } from "crypto"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFindUnique = vi.fn()
const mockUpdateMany = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditJob: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      updateMany: (...args: unknown[]) => mockUpdateMany(...args),
    },
  },
}))

const mockTasksTrigger = vi.fn().mockResolvedValue({ id: "trigger-run-1" })
vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger: (...args: unknown[]) => mockTasksTrigger(...args) },
}))

vi.mock("@/trigger/audit-pipeline", () => ({ auditPipeline: {} }))
vi.mock("@/lib/notify", () => ({
  notifyAuditStarted: vi.fn().mockResolvedValue(undefined),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

const CALLBACK_TOKEN = "test-secret-token-12345"

function buildHmac(params: Record<string, string>, token: string): string {
  const sortedKeys = Object.keys(params).filter((k) => k !== "checksum").sort()
  const message = sortedKeys.map((k) => `${k};${params[k]}`).join(";")
  return createHmac("sha256", token).update(message).digest("hex").toUpperCase()
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/payment/callback", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.ALFABANK_CALLBACK_TOKEN
    delete process.env.ALFABANK_CALLBACK_TOKEN_RU
  })

  it("rejects invalid checksum with 403", async () => {
    process.env.ALFABANK_CALLBACK_TOKEN = CALLBACK_TOKEN

    const params = {
      operation: "deposited",
      status: "1",
      orderNumber: "job-123",
      mdOrder: "bank-order-1",
      checksum: "INVALIDSIGNATURE",
    }

    const { POST } = await import("@/app/api/payment/callback/route")
    const body = new URLSearchParams(params).toString()
    const { NextRequest } = await import("next/server")
    const req = new NextRequest(
      new Request("https://kaligeo.by/api/payment/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    )

    const res = await POST(req)
    expect(res.status).toBe(403)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
  })

  it("accepts valid checksum and triggers pipeline for deposited+status=1", async () => {
    process.env.ALFABANK_CALLBACK_TOKEN = CALLBACK_TOKEN

    const params = {
      operation: "deposited",
      status: "1",
      orderNumber: "job-456",
      mdOrder: "bank-order-2",
    }
    params["checksum" as keyof typeof params] = buildHmac(params, CALLBACK_TOKEN)

    mockFindUnique.mockResolvedValue({
      id: "job-456",
      tier: "STANDARD",
      companyName: "TestCo",
      paidAt: null,
    })
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const { POST } = await import("@/app/api/payment/callback/route")
    const body = new URLSearchParams(params).toString()
    const { NextRequest } = await import("next/server")
    const req = new NextRequest(
      new Request("https://kaligeo.by/api/payment/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    )

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "job-456", paidAt: null },
      data: expect.objectContaining({ status: "PENDING" }),
    })
    expect(mockTasksTrigger).toHaveBeenCalledWith("audit-pipeline", { jobId: "job-456" })
  })

  it("ignores non-deposited operations (returns 200, no pipeline)", async () => {
    // No token — skip signature check
    const params = {
      operation: "reversed",
      status: "1",
      orderNumber: "job-789",
      mdOrder: "bank-order-3",
    }

    const { POST } = await import("@/app/api/payment/callback/route")
    const body = new URLSearchParams(params).toString()
    const { NextRequest } = await import("next/server")
    const req = new NextRequest(
      new Request("https://kaligeo.by/api/payment/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    )

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.ignored).toBe(true)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
  })

  it("ignores status=0 (failed payment)", async () => {
    const params = {
      operation: "deposited",
      status: "0",
      orderNumber: "job-fail",
      mdOrder: "bank-order-fail",
    }

    const { POST } = await import("@/app/api/payment/callback/route")
    const body = new URLSearchParams(params).toString()
    const { NextRequest } = await import("next/server")
    const req = new NextRequest(
      new Request("https://kaligeo.by/api/payment/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    )

    const res = await POST(req)
    const json = await res.json()

    expect(json.ignored).toBe(true)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
  })

  it("returns 404 when job not found", async () => {
    mockFindUnique.mockResolvedValue(null)

    const params = {
      operation: "deposited",
      status: "1",
      orderNumber: "job-notfound",
      mdOrder: "bank-order-x",
    }

    const { POST } = await import("@/app/api/payment/callback/route")
    const body = new URLSearchParams(params).toString()
    const { NextRequest } = await import("next/server")
    const req = new NextRequest(
      new Request("https://kaligeo.by/api/payment/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    )

    const res = await POST(req)
    expect(res.status).toBe(404)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
  })

  it("is idempotent: already paid job returns 200 without triggering pipeline again", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-paid",
      tier: "BASIC",
      companyName: "PaidCo",
      paidAt: new Date("2026-01-01"),  // already paid
    })

    const params = {
      operation: "deposited",
      status: "1",
      orderNumber: "job-paid",
      mdOrder: "bank-order-dup",
    }

    const { POST } = await import("@/app/api/payment/callback/route")
    const body = new URLSearchParams(params).toString()
    const { NextRequest } = await import("next/server")
    const req = new NextRequest(
      new Request("https://kaligeo.by/api/payment/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    )

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.alreadyPaid).toBe(true)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it("skips signature check when no token configured", async () => {
    // ALFABANK_CALLBACK_TOKEN not set → no verification
    mockFindUnique.mockResolvedValue({
      id: "job-notoken",
      tier: "BASIC",
      companyName: "NoCo",
      paidAt: null,
    })
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const params = {
      operation: "deposited",
      status: "1",
      orderNumber: "job-notoken",
      mdOrder: "bank-order-nt",
      checksum: "ANYTHING-GOES",
    }

    const { POST } = await import("@/app/api/payment/callback/route")
    const body = new URLSearchParams(params).toString()
    const { NextRequest } = await import("next/server")
    const req = new NextRequest(
      new Request("https://kaligeo.by/api/payment/callback", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      })
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockTasksTrigger).toHaveBeenCalled()
  })
})
