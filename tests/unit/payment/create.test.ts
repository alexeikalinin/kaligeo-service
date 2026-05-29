/**
 * Tests for POST /api/payment/create
 *
 * Critical security: amount is determined server-side from tier.
 * Tests cover: pricing correctness, locale/merchant selection, error cases.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditJob: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
    },
  },
}))

vi.mock("@/lib/cors", () => ({
  getCorsHeaders: vi.fn().mockReturnValue({}),
  corsOptionsResponse: vi.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callCreate(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
) {
  vi.resetModules()

  // Set test env
  process.env.ALFABANK_USER = "test-user-by"
  process.env.ALFABANK_PASS = "test-pass-by"
  process.env.ALFABANK_USER_RU = "test-user-ru"
  process.env.ALFABANK_PASS_RU = "test-pass-ru"
  process.env.ALFABANK_SANDBOX = "true"

  const { POST } = await import("@/app/api/payment/create/route")
  const { NextRequest } = await import("next/server")

  const req = new NextRequest(
    new Request("https://kaligeo.by/api/payment/create", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    })
  )

  return POST(req)
}

let capturedFetchParams: URLSearchParams | null = null

function setupGlobalFetch(response: object) {
  capturedFetchParams = null
  global.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
    if (init?.body) {
      capturedFetchParams = new URLSearchParams(init.body as string)
    }
    return {
      ok: true,
      json: async () => response,
    } as Response
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/payment/create", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    capturedFetchParams = null
  })

  it("returns 400 when jobId is missing", async () => {
    const res = await callCreate({})
    expect(res.status).toBe(400)
  })

  it("returns 404 when job not found", async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await callCreate({ jobId: "nonexistent-job" })
    expect(res.status).toBe(404)
  })

  it("returns 400 when job is already paid", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-1",
      tier: "BASIC",
      companyName: "TestCo",
      paidAt: new Date(),
      alfaBankOrderId: null,
    })

    const res = await callCreate({ jobId: "job-1" })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/оплачена/i)
  })

  it("returns 400 when bank order already created", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-2",
      tier: "BASIC",
      companyName: "TestCo",
      paidAt: null,
      alfaBankOrderId: "existing-bank-order",
    })

    const res = await callCreate({ jobId: "job-2" })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/заказ/i)
  })

  it("sends correct BYN amount for BASIC tier (locale=by)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-basic-by",
      tier: "BASIC",
      companyName: "CompanyBY",
      paidAt: null,
      alfaBankOrderId: null,
    })
    mockUpdate.mockResolvedValue({})
    setupGlobalFetch({ orderId: "bank-123", formUrl: "https://sandbox.alfabank.by/pay/bank-123" })

    const res = await callCreate({ jobId: "job-basic-by", locale: "by" })
    expect(res.status).toBe(200)

    // BASIC BYN = 14900 kopecks
    expect(capturedFetchParams?.get("amount")).toBe("14900")
    expect(capturedFetchParams?.get("currency")).toBe("933")  // BYN ISO
    expect(capturedFetchParams?.get("userName")).toBe("test-user-by")
  })

  it("sends correct RUB amount for BASIC tier (locale=ru)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-basic-ru",
      tier: "BASIC",
      companyName: "CompanyRU",
      paidAt: null,
      alfaBankOrderId: null,
    })
    mockUpdate.mockResolvedValue({})
    setupGlobalFetch({ orderId: "bank-456", formUrl: "https://sandbox.alfabank.by/pay/bank-456" })

    const res = await callCreate({ jobId: "job-basic-ru", locale: "ru" })
    expect(res.status).toBe(200)

    // BASIC RUB = 490000 kopecks
    expect(capturedFetchParams?.get("amount")).toBe("490000")
    expect(capturedFetchParams?.get("currency")).toBe("643")  // RUB ISO
    expect(capturedFetchParams?.get("userName")).toBe("test-user-ru")
  })

  it("sends correct RUB amount for ADVANCED tier", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-adv-ru",
      tier: "ADVANCED",
      companyName: "BigCo",
      paidAt: null,
      alfaBankOrderId: null,
    })
    mockUpdate.mockResolvedValue({})
    setupGlobalFetch({ orderId: "bank-789", formUrl: "https://sandbox.alfabank.by/pay/bank-789" })

    const res = await callCreate({ jobId: "job-adv-ru", locale: "ru" })
    expect(res.status).toBe(200)

    // ADVANCED RUB = 2790000 kopecks (27900 RUB)
    expect(capturedFetchParams?.get("amount")).toBe("2790000")
  })

  it("detects locale from Origin header (kaligeo.ru → RU merchant)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-origin-ru",
      tier: "STANDARD",
      companyName: "RuCo",
      paidAt: null,
      alfaBankOrderId: null,
    })
    mockUpdate.mockResolvedValue({})
    setupGlobalFetch({ orderId: "bank-ru", formUrl: "https://ecom.alfabank.by/pay/bank-ru" })

    // No explicit locale, but Origin is kaligeo.ru
    const res = await callCreate(
      { jobId: "job-origin-ru" },
      { Origin: "https://kaligeo.ru" }
    )
    expect(res.status).toBe(200)
    expect(capturedFetchParams?.get("currency")).toBe("643")  // RUB
    expect(capturedFetchParams?.get("userName")).toBe("test-user-ru")
  })

  it("defaults to BY locale when no Origin", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-default-by",
      tier: "STANDARD",
      companyName: "DefaultCo",
      paidAt: null,
      alfaBankOrderId: null,
    })
    mockUpdate.mockResolvedValue({})
    setupGlobalFetch({ orderId: "bank-default", formUrl: "https://sandbox.alfabank.by/pay/bank-default" })

    const res = await callCreate({ jobId: "job-default-by" })
    expect(res.status).toBe(200)
    expect(capturedFetchParams?.get("currency")).toBe("933")  // BYN
    expect(capturedFetchParams?.get("userName")).toBe("test-user-by")
  })

  it("persists alfaBankOrderId after successful order creation", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-persist",
      tier: "BASIC",
      companyName: "PersistCo",
      paidAt: null,
      alfaBankOrderId: null,
    })
    mockUpdate.mockResolvedValue({})
    setupGlobalFetch({ orderId: "bank-persist-id", formUrl: "https://sandbox.alfabank.by/pay/persist" })

    await callCreate({ jobId: "job-persist" })

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "job-persist" },
      data: { alfaBankOrderId: "bank-persist-id" },
    })
  })

  it("returns 502 when bank API is unavailable", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-bankdown",
      tier: "BASIC",
      companyName: "BankdownCo",
      paidAt: null,
      alfaBankOrderId: null,
    })
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"))

    const res = await callCreate({ jobId: "job-bankdown" })
    expect(res.status).toBe(502)
  })

  it("returns orderId and formUrl on success", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-success",
      tier: "STANDARD",
      companyName: "SuccessCo",
      paidAt: null,
      alfaBankOrderId: null,
    })
    mockUpdate.mockResolvedValue({})
    setupGlobalFetch({ orderId: "order-ok", formUrl: "https://sandbox.alfabank.by/pay/order-ok" })

    const res = await callCreate({ jobId: "job-success" })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.orderId).toBe("order-ok")
    expect(json.formUrl).toBe("https://sandbox.alfabank.by/pay/order-ok")
  })

  it("handles bank error response (errorCode != 0)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-bankerr",
      tier: "BASIC",
      companyName: "BankErrCo",
      paidAt: null,
      alfaBankOrderId: null,
    })
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ errorCode: 1, errorMessage: "Merchant not found" }),
    })) as unknown as typeof fetch

    const res = await callCreate({ jobId: "job-bankerr" })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.errorCode).toBe(1)
  })
})
