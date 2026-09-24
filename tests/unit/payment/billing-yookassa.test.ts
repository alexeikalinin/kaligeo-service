/**
 * Tests for lib/billing/yookassa.ts — the YooKassa v3 adapter used for kaligeo.ru once
 * YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY are configured.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

function mockFetchOnce(response: object, ok = true) {
  global.fetch = vi.fn(async () => ({
    ok,
    status: ok ? 200 : 400,
    json: async () => response,
  })) as unknown as typeof fetch
}

describe("lib/billing/yookassa", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env.YOOKASSA_SHOP_ID = "shop-1"
    process.env.YOOKASSA_SECRET_KEY = "secret-1"
  })

  it("createPayment returns orderId/formUrl from confirmation_url", async () => {
    mockFetchOnce({ id: "pay-1", status: "pending", paid: false, confirmation: { confirmation_url: "https://yookassa/pay/pay-1" } })
    const { createPayment } = await import("@/lib/billing/yookassa")

    const result = await createPayment({
      amount: 299000,
      description: "test",
      returnUrl: "https://kaligeo.ru/return",
      savePaymentMethod: true,
      idempotenceKey: "job-1",
    })

    expect(result).toEqual({ ok: true, orderId: "pay-1", formUrl: "https://yookassa/pay/pay-1" })
  })

  it("createPayment converts kopecks to a 2-decimal RUB string", async () => {
    let body: Record<string, unknown> = {}
    global.fetch = vi.fn(async (_url, init) => {
      body = JSON.parse(init!.body as string)
      return { ok: true, status: 200, json: async () => ({ id: "p", confirmation: { confirmation_url: "u" } }) }
    }) as unknown as typeof fetch
    const { createPayment } = await import("@/lib/billing/yookassa")

    await createPayment({
      amount: 299000, // 2990.00 RUB
      description: "test",
      returnUrl: "https://kaligeo.ru/return",
      idempotenceKey: "job-1",
    })

    expect((body.amount as { value: string }).value).toBe("2990.00")
  })

  it("createPayment surfaces provider error", async () => {
    mockFetchOnce({ description: "invalid shop" }, false)
    const { createPayment } = await import("@/lib/billing/yookassa")

    const result = await createPayment({
      amount: 1000,
      description: "test",
      returnUrl: "https://kaligeo.ru/return",
      idempotenceKey: "job-1",
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe("invalid shop")
  })

  it("chargeSavedMethod reports ok=true on succeeded/paid payment", async () => {
    mockFetchOnce({ id: "pay-2", status: "succeeded", paid: true })
    const { chargeSavedMethod } = await import("@/lib/billing/yookassa")

    const result = await chargeSavedMethod({
      amount: 999000,
      paymentMethodId: "pm-1",
      description: "recurring",
      idempotenceKey: "sub-1-2026-09",
    })

    expect(result.ok).toBe(true)
    expect(result.providerOrderId).toBe("pay-2")
  })

  it("chargeSavedMethod reports ok=false when canceled", async () => {
    mockFetchOnce({ id: "pay-3", status: "canceled", paid: false, cancellation_details: { reason: "insufficient_funds" } })
    const { chargeSavedMethod } = await import("@/lib/billing/yookassa")

    const result = await chargeSavedMethod({
      amount: 999000,
      paymentMethodId: "pm-1",
      description: "recurring",
      idempotenceKey: "sub-1-2026-09",
    })

    expect(result.ok).toBe(false)
    expect(result.error).toBe("insufficient_funds")
  })

  it("getPayment returns null on non-2xx", async () => {
    mockFetchOnce({}, false)
    const { getPayment } = await import("@/lib/billing/yookassa")
    const result = await getPayment("pay-404")
    expect(result).toBeNull()
  })
})
