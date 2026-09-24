import type { BillingProvider } from "./types"

/**
 * kaligeo.by always pays through Alfa-Bank.
 * kaligeo.ru pays through YooKassa once YOOKASSA_SHOP_ID/YOOKASSA_SECRET_KEY are configured;
 * until then it falls back to the existing Alfa-Bank RU merchant account — this keeps the
 * one-off payment flow working unchanged while YooKassa credentials are being set up.
 */
export function resolveProvider(market: string): BillingProvider {
  if (market === "ru" && process.env.YOOKASSA_SHOP_ID && process.env.YOOKASSA_SECRET_KEY) {
    return "yookassa"
  }
  return "alfabank"
}
