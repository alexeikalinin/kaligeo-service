export type BillingProvider = "alfabank" | "yookassa"

export interface ChargeResult {
  ok: boolean
  error?: string
  /** Provider-side identifier for the charge (Alfa orderId / YooKassa payment id) */
  providerOrderId?: string
  /** Amount actually charged, in minor units (kopecks) — echoes input on success */
  amount?: number
}

export interface OrderResult {
  ok: boolean
  error?: string
  /** Raw provider error code, when the provider has one (Alfa-Bank errorCode) */
  errorCode?: number
  orderId?: string
  /** URL to redirect the payer to for card entry / 3DS */
  formUrl?: string
}

export interface BindingResult {
  ok: boolean
  error?: string
  bindingId?: string
}
