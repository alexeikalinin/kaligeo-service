/**
 * Alfa-Bank Payment Gateway adapter (Sberbank-style REST API: register.do / getOrderStatusExtended.do / …).
 *
 * Used for both one-off payments (kaligeo.by always, kaligeo.ru until YooKassa credentials are set —
 * see lib/billing/provider.ts) and, once the bank enables card binding on the merchant account
 * (ALFABANK_BINDING_ENABLED=true), recurring charges for MONITOR_* subscriptions.
 *
 * Binding flow (register.do w/ clientId → getBindings.do → paymentOrderBinding.do) is the bank's
 * documented recurring-payment mechanism, but exact field names should be confirmed against the
 * docs the bank provides when binding is enabled — errors from these calls are surfaced with the
 * bank's raw errorCode/errorMessage rather than swallowed, so a mismatch fails loudly in logs.
 */
import type { BindingResult, ChargeResult, OrderResult } from "./types"

const SANDBOX_URL = "https://abby.rbsuat.com/payment/rest"
const PROD_URL = "https://ecom.alfabank.by/payment/rest"

export interface AlfaMerchant {
  userName: string
  password: string
}

function baseUrl(): string {
  return process.env.ALFABANK_SANDBOX === "true" ? SANDBOX_URL : PROD_URL
}

export function bindingEnabled(): boolean {
  return process.env.ALFABANK_BINDING_ENABLED === "true"
}

interface RegisterParams {
  merchant: AlfaMerchant
  amount: number // minor units (kopecks)
  currency: string // ISO 4217 numeric, e.g. "933" BYN, "643" RUB
  orderNumber: string
  returnUrl: string
  failUrl: string
  description: string
  /** Our internal client id — required by the bank to create a card binding after successful payment */
  clientId?: string
}

export async function registerOrder(params: RegisterParams): Promise<OrderResult> {
  const { merchant, amount, currency, orderNumber, returnUrl, failUrl, description, clientId } = params

  const body = new URLSearchParams({
    userName: merchant.userName,
    password: merchant.password,
    orderNumber,
    amount: String(amount),
    currency,
    returnUrl,
    failUrl,
    description,
    language: "ru",
    pageView: "DESKTOP",
    ...(clientId ? { clientId } : {}),
  })

  // Network/HTTP-level failures are NOT caught here — they propagate so callers can
  // distinguish "bank unavailable" (502) from "bank rejected the request" (400 below).
  const resp = await fetch(`${baseUrl()}/register.do`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    redirect: "follow",
  })

  if (!resp.ok) throw new Error(`Bank API HTTP ${resp.status}`)

  const data = (await resp.json()) as {
    errorCode?: number
    errorMessage?: string
    orderId?: string
    formUrl?: string
  }

  if (data.errorCode && data.errorCode !== 0) {
    return { ok: false, error: data.errorMessage ?? `errorCode ${data.errorCode}`, errorCode: data.errorCode }
  }
  if (!data.orderId || !data.formUrl) {
    throw new Error("Bank returned no orderId or formUrl")
  }

  return { ok: true, orderId: data.orderId, formUrl: data.formUrl }
}

export async function getOrderStatus(
  merchant: AlfaMerchant,
  orderId: string
): Promise<{ paid: boolean; orderStatus?: number; errorCode?: number; errorMessage?: string; amount?: number }> {
  const body = new URLSearchParams({
    userName: merchant.userName,
    password: merchant.password,
    orderId,
    language: "ru",
  })

  const resp = await fetch(`${baseUrl()}/getOrderStatusExtended.do`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    redirect: "follow",
  })

  const data = (await resp.json()) as {
    orderStatus?: number
    errorCode?: number
    errorMessage?: string
    amount?: number
  }

  return { paid: data.orderStatus === 2, ...data }
}

/**
 * Looks up the card binding created after a successful clientId-tagged payment.
 * Only meaningful once the bank has enabled binding on the merchant account (bindingEnabled()).
 */
export async function getBindings(merchant: AlfaMerchant, clientId: string): Promise<BindingResult> {
  const body = new URLSearchParams({
    userName: merchant.userName,
    password: merchant.password,
    clientId,
  })

  try {
    const resp = await fetch(`${baseUrl()}/getBindings.do`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "follow",
    })

    if (!resp.ok) return { ok: false, error: `Bank API HTTP ${resp.status}` }

    const data = (await resp.json()) as {
      errorCode?: number
      errorMessage?: string
      bindings?: { bindingId: string }[]
    }

    if (data.errorCode && data.errorCode !== 0) {
      return { ok: false, error: data.errorMessage ?? `errorCode ${data.errorCode}` }
    }

    const bindingId = data.bindings?.[0]?.bindingId
    if (!bindingId) return { ok: false, error: "No binding returned for clientId" }

    return { ok: true, bindingId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Bank API unavailable" }
  }
}

/**
 * Charges a previously bound card: creates a new order, then settles it against the binding.
 * Requires bindingEnabled() — callers must check this before invoking.
 */
export async function chargeBinding(params: {
  merchant: AlfaMerchant
  bindingId: string
  amount: number
  currency: string
  orderNumber: string
  description: string
}): Promise<ChargeResult> {
  const { merchant, bindingId, amount, currency, orderNumber, description } = params

  // paymentOrderBinding.do still needs an order to exist first — register it without a redirect flow.
  const order = await registerOrder({
    merchant,
    amount,
    currency,
    orderNumber,
    // returnUrl/failUrl are required by register.do but never visited for a binding charge
    returnUrl: "https://kaligeo.by/api/payment/binding-noop",
    failUrl: "https://kaligeo.by/api/payment/binding-noop",
    description,
  })

  if (!order.ok || !order.orderId) {
    return { ok: false, error: order.error ?? "Failed to register order for binding charge" }
  }

  const body = new URLSearchParams({
    userName: merchant.userName,
    password: merchant.password,
    mdOrder: order.orderId,
    bindingId,
    language: "ru",
  })

  try {
    const resp = await fetch(`${baseUrl()}/paymentOrderBinding.do`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "follow",
    })

    if (!resp.ok) return { ok: false, error: `Bank API HTTP ${resp.status}` }

    const data = (await resp.json()) as { errorCode?: number; errorMessage?: string }

    if (data.errorCode && data.errorCode !== 0) {
      return { ok: false, error: data.errorMessage ?? `errorCode ${data.errorCode}`, providerOrderId: order.orderId }
    }

    return { ok: true, providerOrderId: order.orderId, amount }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Bank API unavailable",
      providerOrderId: order.orderId,
    }
  }
}

/** Selects the right merchant credentials for a market ("ru" | "by") */
export function merchantForMarket(market: string): AlfaMerchant {
  const isRu = market === "ru"
  return {
    userName: isRu ? (process.env.ALFABANK_USER_RU ?? "") : (process.env.ALFABANK_USER ?? ""),
    password: isRu ? (process.env.ALFABANK_PASS_RU ?? "") : (process.env.ALFABANK_PASS ?? ""),
  }
}
