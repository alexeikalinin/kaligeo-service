/**
 * Tests for GET /api/payment/status?jobId=<id>
 *
 * Покрытие: 0% → target 90%+
 * Критичный путь: идемпотентность, двойной запуск пайплайна, локальный кэш vs банк.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFindUnique = vi.fn()
const mockUpdateMany = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditJob: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      updateMany:  (...a: unknown[]) => mockUpdateMany(...a),
    },
  },
}))

const mockTasksTrigger = vi.fn().mockResolvedValue({ id: "run-1" })
vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger: (...a: unknown[]) => mockTasksTrigger(...a) },
}))
vi.mock("@/trigger/audit-pipeline", () => ({ auditPipeline: {} }))
vi.mock("@/lib/notify", () => ({ notifyAuditStarted: vi.fn().mockResolvedValue(undefined) }))
vi.mock("@/lib/cors", () => ({
  getCorsHeaders: vi.fn().mockReturnValue({}),
  corsOptionsResponse: vi.fn(),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callStatus(jobId: string | null, bankResponse?: object) {
  vi.resetModules()

  process.env.ALFABANK_USER    = "test-user"
  process.env.ALFABANK_PASS    = "test-pass"
  process.env.ALFABANK_SANDBOX = "true"

  if (bankResponse !== undefined) {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => bankResponse,
    }) as unknown as typeof fetch
  }

  const { GET } = await import("@/app/api/payment/status/route")
  const { NextRequest } = await import("next/server")

  const url = jobId
    ? `https://kaligeo.by/api/payment/status?jobId=${jobId}`
    : `https://kaligeo.by/api/payment/status`

  return GET(new NextRequest(new Request(url)))
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/payment/status", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("returns 400 when jobId param missing", async () => {
    const res = await callStatus(null)
    expect(res.status).toBe(400)
  })

  it("returns 404 when job not found in DB", async () => {
    mockFindUnique.mockResolvedValue(null)
    const res = await callStatus("no-such-job")
    expect(res.status).toBe(404)
  })

  it("returns paid=true immediately if paidAt already set (no bank call)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-already-paid",
      tier: "BASIC",
      companyName: "PaidCo",
      paidAt: new Date(),
      alfaBankOrderId: "bank-order-1",
    })
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    const res = await callStatus("job-already-paid")
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.paid).toBe(true)
    expect(json.alreadyPaid).toBe(true)
    expect(fetchSpy).not.toHaveBeenCalled()   // no bank call needed
  })

  it("returns 400 when alfaBankOrderId not set (order not created yet)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-no-order",
      tier: "BASIC",
      companyName: "NoCo",
      paidAt: null,
      alfaBankOrderId: null,
    })

    const res = await callStatus("job-no-order")
    expect(res.status).toBe(400)
  })

  it("returns paid=false when bank orderStatus != 2", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-pending",
      tier: "BASIC",
      companyName: "PendingCo",
      paidAt: null,
      alfaBankOrderId: "bank-order-pending",
    })

    const res = await callStatus("job-pending", { orderStatus: 0, errorCode: 0 })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.paid).toBe(false)
    expect(mockUpdateMany).not.toHaveBeenCalled()
    expect(mockTasksTrigger).not.toHaveBeenCalled()
  })

  it("marks paid and triggers pipeline when bank returns orderStatus=2", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-confirmed",
      tier: "STANDARD",
      companyName: "ConfirmedCo",
      paidAt: null,
      alfaBankOrderId: "bank-order-confirmed",
    })
    mockUpdateMany.mockResolvedValue({ count: 1 })

    const res = await callStatus("job-confirmed", { orderStatus: 2, amount: 1390000 })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.paid).toBe(true)
    expect(json.orderStatus).toBe(2)
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: "job-confirmed", paidAt: null },
      data: expect.objectContaining({ status: "PENDING" }),
    })
    expect(mockTasksTrigger).toHaveBeenCalledWith("audit-pipeline", { jobId: "job-confirmed" })
  })

  it("is idempotent: does NOT re-trigger pipeline if updateMany.count=0 (race condition)", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-race",
      tier: "BASIC",
      companyName: "RaceCo",
      paidAt: null,
      alfaBankOrderId: "bank-order-race",
    })
    // Another process already set paidAt → updateMany matches 0 rows
    mockUpdateMany.mockResolvedValue({ count: 0 })

    const res = await callStatus("job-race", { orderStatus: 2 })
    const json = await res.json()

    expect(json.paid).toBe(true)
    expect(mockTasksTrigger).not.toHaveBeenCalled()  // not re-triggered
  })

  it("returns 502 when bank API throws", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-bankdown",
      tier: "BASIC",
      companyName: "BankDownCo",
      paidAt: null,
      alfaBankOrderId: "bank-order-down",
    })
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error")) as unknown as typeof fetch

    const res = await callStatus("job-bankdown")
    expect(res.status).toBe(502)
  })

  it("passes alfaBankOrderId (not jobId) to bank getOrderStatusExtended", async () => {
    mockFindUnique.mockResolvedValue({
      id: "job-check-params",
      tier: "BASIC",
      companyName: "ParamCo",
      paidAt: null,
      alfaBankOrderId: "actual-bank-order-xyz",
    })
    mockUpdateMany.mockResolvedValue({ count: 0 })

    let capturedBody: URLSearchParams | null = null
    global.fetch = vi.fn(async (_url: unknown, init?: RequestInit) => {
      capturedBody = new URLSearchParams(init?.body as string)
      return { ok: true, json: async () => ({ orderStatus: 0 }) } as Response
    }) as unknown as typeof fetch

    await callStatus("job-check-params")

    expect(capturedBody?.get("orderId")).toBe("actual-bank-order-xyz")
    expect(capturedBody?.get("orderId")).not.toBe("job-check-params")
  })
})
