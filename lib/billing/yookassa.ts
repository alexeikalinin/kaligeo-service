/**
 * YooKassa (ЮKassa) REST API v3 adapter — used exclusively for kaligeo.ru once
 * YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY are configured (see lib/billing/provider.ts).
 *
 * Webhooks from YooKassa are unsigned, so the safe pattern is: on webhook receipt,
 * re-fetch the payment by id via getPayment() and trust that response, not the webhook body.
 */
import type { ChargeResult, OrderResult } from "./types"

const API_BASE = "https://api.yookassa.ru/v3"

function authHeader(): string {
  const shopId = process.env.YOOKASSA_SHOP_ID ?? ""
  const secretKey = process.env.YOOKASSA_SECRET_KEY ?? ""
  return `Basic ${Buffer.from(`${shopId}:${secretKey}`).toString("base64")}`
}

export interface YooKassaPayment {
  id: string
  status: "pending" | "waiting_for_capture" | "succeeded" | "canceled"
  paid: boolean
  confirmation?: { confirmation_url?: string }
  payment_method?: { id: string; saved: boolean; type: string; card?: { last4: string } }
  cancellation_details?: { reason: string }
}

interface CreatePaymentParams {
  amount: number // minor units (kopecks) — converted to YooKassa's decimal string internally
  currency?: string // default "RUB"
  description: string
  returnUrl: string
  savePaymentMethod?: boolean
  metadata?: Record<string, string>
  idempotenceKey: string
}

function toDecimal(amountMinorUnits: number): string {
  return (amountMinorUnits / 100).toFixed(2)
}

async function post(path: string, body: object, idempotenceKey: string) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader(),
      "Idempotence-Key": idempotenceKey,
    },
    body: JSON.stringify(body),
  })
  const data = await resp.json().catch(() => ({}))
  return { ok: resp.ok, status: resp.status, data }
}

export async function createPayment(params: CreatePaymentParams): Promise<OrderResult> {
  const { amount, currency = "RUB", description, returnUrl, savePaymentMethod, metadata, idempotenceKey } = params

  const { ok, data } = await post(
    "/payments",
    {
      amount: { value: toDecimal(amount), currency },
      capture: true,
      confirmation: { type: "redirect", return_url: returnUrl },
      description,
      save_payment_method: !!savePaymentMethod,
      metadata,
    },
    idempotenceKey
  )

  if (!ok) {
    const err = (data as { description?: string })?.description ?? "YooKassa API error"
    return { ok: false, error: err }
  }

  const payment = data as YooKassaPayment
  const formUrl = payment.confirmation?.confirmation_url
  if (!formUrl) return { ok: false, error: "YooKassa returned no confirmation_url" }

  return { ok: true, orderId: payment.id, formUrl }
}

export async function chargeSavedMethod(params: {
  amount: number
  currency?: string
  paymentMethodId: string
  description: string
  metadata?: Record<string, string>
  idempotenceKey: string
}): Promise<ChargeResult> {
  const { amount, currency = "RUB", paymentMethodId, description, metadata, idempotenceKey } = params

  const { ok, data } = await post(
    "/payments",
    {
      amount: { value: toDecimal(amount), currency },
      capture: true,
      payment_method_id: paymentMethodId,
      description,
      metadata,
    },
    idempotenceKey
  )

  if (!ok) {
    const err = (data as { description?: string })?.description ?? "YooKassa API error"
    return { ok: false, error: err }
  }

  const payment = data as YooKassaPayment
  if (payment.status === "canceled") {
    return { ok: false, error: payment.cancellation_details?.reason ?? "Payment canceled", providerOrderId: payment.id }
  }

  return { ok: payment.paid || payment.status === "succeeded", providerOrderId: payment.id, amount }
}

export async function getPayment(paymentId: string): Promise<YooKassaPayment | null> {
  const resp = await fetch(`${API_BASE}/payments/${paymentId}`, {
    headers: { Authorization: authHeader() },
  })
  if (!resp.ok) return null
  return (await resp.json()) as YooKassaPayment
}
