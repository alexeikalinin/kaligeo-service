/**
 * Tests for lib/billing/alfabank.ts — the register/status/binding adapter shared by
 * the one-off payment routes and trigger/subscription-billing.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

function mockFetchOnce(response: object, ok = true) {
  global.fetch = vi.fn(async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => response,
  })) as unknown as typeof fetch
}

const MERCHANT = { userName: "u", password: "p" }

describe("lib/billing/alfabank", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.ALFABANK_SANDBOX = "true"
    delete process.env.ALFABANK_BINDING_ENABLED
  })

  it("registerOrder returns orderId/formUrl on success", async () => {
    mockFetchOnce({ orderId: "ord-1", formUrl: "https://sandbox/pay/ord-1" })
    const { registerOrder } = await import("@/lib/billing/alfabank")

    const result = await registerOrder({
      merchant: MERCHANT,
      amount: 1000,
      currency: "933",
      orderNumber: "job-1",
      returnUrl: "https://x/return",
      failUrl: "https://x/fail",
      description: "test",
    })

    expect(result).toEqual({ ok: true, orderId: "ord-1", formUrl: "https://sandbox/pay/ord-1" })
  })

  it("registerOrder returns errorCode on bank rejection", async () => {
    mockFetchOnce({ errorCode: 5, errorMessage: "bad merchant" })
    const { registerOrder } = await import("@/lib/billing/alfabank")

    const result = await registerOrder({
      merchant: MERCHANT,
      amount: 1000,
      currency: "933",
      orderNumber: "job-1",
      returnUrl: "https://x/return",
      failUrl: "https://x/fail",
      description: "test",
    })

    expect(result.ok).toBe(false)
    expect(result.errorCode).toBe(5)
  })

  it("registerOrder throws on non-2xx HTTP (caller maps to 502)", async () => {
    mockFetchOnce({}, false)
    const { registerOrder } = await import("@/lib/billing/alfabank")

    await expect(
      registerOrder({
        merchant: MERCHANT,
        amount: 1000,
        currency: "933",
        orderNumber: "job-1",
        returnUrl: "https://x/return",
        failUrl: "https://x/fail",
        description: "test",
      })
    ).rejects.toThrow()
  })

  it("registerOrder passes clientId through when provided", async () => {
    let captured: URLSearchParams | null = null
    global.fetch = vi.fn(async (_url, init) => {
      captured = new URLSearchParams(init!.body as string)
      return { ok: true, status: 200, json: async () => ({ orderId: "o", formUrl: "u" }) }
    }) as unknown as typeof fetch
    const { registerOrder } = await import("@/lib/billing/alfabank")

    await registerOrder({
      merchant: MERCHANT,
      amount: 1000,
      currency: "933",
      orderNumber: "job-1",
      returnUrl: "https://x/return",
      failUrl: "https://x/fail",
      description: "test",
      clientId: "client-42",
    })

    expect(captured?.get("clientId")).toBe("client-42")
  })

  it("getOrderStatus reports paid=true only for orderStatus 2", async () => {
    mockFetchOnce({ orderStatus: 2 })
    const { getOrderStatus } = await import("@/lib/billing/alfabank")
    const result = await getOrderStatus(MERCHANT, "ord-1")
    expect(result.paid).toBe(true)
  })

  it("getOrderStatus reports paid=false for other statuses", async () => {
    mockFetchOnce({ orderStatus: 0 })
    const { getOrderStatus } = await import("@/lib/billing/alfabank")
    const result = await getOrderStatus(MERCHANT, "ord-1")
    expect(result.paid).toBe(false)
  })

  it("bindingEnabled reflects ALFABANK_BINDING_ENABLED env var", async () => {
    const { bindingEnabled } = await import("@/lib/billing/alfabank")
    expect(bindingEnabled()).toBe(false)
    process.env.ALFABANK_BINDING_ENABLED = "true"
    expect(bindingEnabled()).toBe(true)
  })

  it("chargeBinding fails cleanly when the underlying order registration fails", async () => {
    mockFetchOnce({ errorCode: 7, errorMessage: "order failed" })
    const { chargeBinding } = await import("@/lib/billing/alfabank")

    const result = await chargeBinding({
      merchant: MERCHANT,
      bindingId: "bind-1",
      amount: 1000,
      currency: "933",
      orderNumber: "sub-1-2026-09",
      description: "test",
    })

    expect(result.ok).toBe(false)
  })

  it("merchantForMarket selects RU credentials for market=ru", async () => {
    process.env.ALFABANK_USER = "by-user"
    process.env.ALFABANK_PASS = "by-pass"
    process.env.ALFABANK_USER_RU = "ru-user"
    process.env.ALFABANK_PASS_RU = "ru-pass"
    const { merchantForMarket } = await import("@/lib/billing/alfabank")

    expect(merchantForMarket("ru")).toEqual({ userName: "ru-user", password: "ru-pass" })
    expect(merchantForMarket("by")).toEqual({ userName: "by-user", password: "by-pass" })
  })
})
