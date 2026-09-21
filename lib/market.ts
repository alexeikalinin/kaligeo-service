/**
 * Single source of truth for by/ru market detection and per-market config.
 * Mirrors the locale detection already used in app/api/payment/create/route.ts.
 */

export type Market = "by" | "ru"

export function marketFromDomain(domain: string | null | undefined): Market {
  return domain?.includes("kaligeo.by") ? "by" : "ru"
}

export function marketFromOrigin(origin: string | null | undefined): Market {
  return marketFromDomain(origin)
}

export function marketFromHost(host: string | null | undefined): Market {
  return marketFromDomain(host)
}

interface MarketConfig {
  market: Market
  landingUrl: string
  appUrl: string
  fromEmail: string
}

export function getMarketConfig(market: Market): MarketConfig {
  if (market === "by") {
    return {
      market,
      landingUrl: "https://kaligeo.by",
      appUrl: "https://app.kaligeo.by",
      fromEmail: process.env.FROM_EMAIL_BY ?? "hello@kaligeo.by",
    }
  }
  return {
    market,
    landingUrl: "https://kaligeo.ru",
    appUrl: "https://app.kaligeo.ru",
    fromEmail: process.env.FROM_EMAIL_RU ?? process.env.FROM_EMAIL ?? "hello@kaligeo.ru",
  }
}
