/**
 * POST /api/payment/create
 *
 * Creates a payment order for a given audit job — Alfa-Bank for kaligeo.by (always) and
 * kaligeo.ru (until YooKassa credentials are set), YooKassa for kaligeo.ru once configured.
 * See lib/billing/provider.ts for the selection rule.
 *
 * For MONITOR_* (subscription) tiers, additionally requests that the provider save the
 * payment method (Alfa card binding / YooKassa save_payment_method) so that
 * trigger/subscription-billing.ts can charge future periods automatically. If the provider
 * isn't configured for that (ALFABANK_BINDING_ENABLED unset, or first YooKassa save fails),
 * the payment itself still succeeds — the subscription simply stays PENDING_FIRST_PAYMENT
 * and never gets auto-charged, with no impact on this one-off payment.
 *
 * Amount is determined SERVER-SIDE from the job's tier — never trusted from the client.
 *
 * Request body: { jobId: string, locale?: "by" | "ru" }
 * Response: { orderId: string, formUrl: string }
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors"
import type { Tier } from "@/lib/gates"
import { registerOrder, merchantForMarket, bindingEnabled } from "@/lib/billing/alfabank"
import { createPayment as createYooKassaPayment } from "@/lib/billing/yookassa"
import { resolveProvider } from "@/lib/billing/provider"

const SUBSCRIPTION_TIERS = new Set(["MONITOR_START", "MONITOR_PRO", "MONITOR_AGENT"])

/** Prices in BYN kopecks (1 BYN = 100 kopecks) */
const TIER_PRICE_BYN_KOPECKS: Record<string, number> = {
  BASIC:         14900,   // 149 BYN
  STANDARD:      44900,   // 449 BYN
  ADVANCED:      89900,   // 899 BYN
  MONITOR_START:  9900,   // 99 BYN/мес
  MONITOR_PRO:   39900,   // 399 BYN/мес
  MONITOR_AGENT: 69900,   // 699 BYN/мес
}

/** Prices in RUB kopecks (1 RUB = 100 kopecks) */
const TIER_PRICE_RUB_KOPECKS: Record<string, number> = {
  BASIC:         490000,  // 4 900 RUB
  STANDARD:     1390000,  // 13 900 RUB
  ADVANCED:     2790000,  // 27 900 RUB
  MONITOR_START: 299000,  // 2 990 RUB/мес
  MONITOR_PRO:   999000,  // 9 990 RUB/мес
  MONITOR_AGENT:1999000,  // 19 990 RUB/мес
}

/** Detect locale from request origin or explicit body param */
function detectLocale(origin: string | null, bodyLocale?: string): "by" | "ru" {
  if (bodyLocale === "ru") return "ru"
  if (bodyLocale === "by") return "by"
  if (origin?.includes("kaligeo.ru")) return "ru"
  return "by" // default to BY
}

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"))
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  const body = await req.json().catch(() => null)
  const { jobId, locale: bodyLocale } = body ?? {}

  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json(
      { error: "jobId is required" },
      { status: 400, headers: corsHeaders }
    )
  }

  // Look up job to get authoritative tier and validate it exists
  const job = await prisma.auditJob.findUnique({
    where: { id: jobId },
    select: { id: true, tier: true, companyName: true, paidAt: true, alfaBankOrderId: true, market: true, clientId: true },
  })

  if (!job) {
    return NextResponse.json(
      { error: "Заявка не найдена" },
      { status: 404, headers: corsHeaders }
    )
  }

  // Job's market (set at submit time) is authoritative — falls back to origin/body detection
  // only in the unlikely case it's missing, so the merchant account never drifts after order creation.
  const locale = (job.market === "ru" || job.market === "by") ? job.market : detectLocale(origin, bodyLocale)

  if (job.paidAt) {
    return NextResponse.json(
      { error: "Заявка уже оплачена" },
      { status: 400, headers: corsHeaders }
    )
  }

  // If we already created a bank order for this job, return it
  if (job.alfaBankOrderId) {
    return NextResponse.json(
      { error: "Заказ уже создан. Обратитесь в поддержку." },
      { status: 400, headers: corsHeaders }
    )
  }

  const tier = job.tier as Tier
  const isRu = locale === "ru"
  const isSubscription = SUBSCRIPTION_TIERS.has(tier)

  const amount = isRu
    ? TIER_PRICE_RUB_KOPECKS[tier]
    : TIER_PRICE_BYN_KOPECKS[tier]

  if (!amount) {
    return NextResponse.json(
      { error: `Неверный тариф: ${tier}` },
      { status: 400, headers: corsHeaders }
    )
  }

  const siteUrl = isRu ? "https://kaligeo.ru" : "https://kaligeo.by"
  const description = `KaliGEO — аудит видимости ${job.companyName}, тариф ${tier}`
  const provider = resolveProvider(locale)

  if (provider === "yookassa") {
    const result = await createYooKassaPayment({
      amount,
      currency: "RUB",
      description,
      returnUrl: `${siteUrl}/?paymentStatus=success&jobId=${job.id}`,
      savePaymentMethod: isSubscription,
      metadata: { jobId: job.id },
      idempotenceKey: job.id,
    })

    if (!result.ok) {
      return NextResponse.json({ errorMessage: result.error ?? "Ошибка создания заказа" }, { status: 400, headers: corsHeaders })
    }

    await prisma.auditJob.update({
      where: { id: job.id },
      data: { alfaBankOrderId: result.orderId }, // reused as generic "provider order id" column
    })

    return NextResponse.json({ orderId: result.orderId, formUrl: result.formUrl }, { headers: corsHeaders })
  }

  // Alfa-Bank branch (kaligeo.by always; kaligeo.ru fallback until YooKassa is configured)
  const currency = isRu ? "643" : "933" // 643 = RUB, 933 = BYN (ISO 4217)
  const merchant = merchantForMarket(locale)

  try {
    const result = await registerOrder({
      merchant,
      amount,
      currency,
      orderNumber: job.id,
      returnUrl: `${siteUrl}/?paymentStatus=success&jobId=${job.id}`,
      failUrl: `${siteUrl}/?paymentStatus=fail&jobId=${job.id}`,
      description,
      // Only ask the bank to bind the card once it has confirmed it supports this —
      // otherwise clientId is simply ignored by register.do with no side effects.
      clientId: isSubscription && bindingEnabled() && job.clientId ? job.clientId : undefined,
    })

    if (!result.ok) {
      return NextResponse.json(
        { errorCode: result.errorCode, errorMessage: result.error ?? "Ошибка создания заказа" },
        { status: 400, headers: corsHeaders }
      )
    }

    // Persist bank orderId so we can look up payment status later
    await prisma.auditJob.update({
      where: { id: job.id },
      data: { alfaBankOrderId: result.orderId },
    })

    return NextResponse.json({ orderId: result.orderId, formUrl: result.formUrl }, { headers: corsHeaders })
  } catch (err) {
    console.error("[payment/create]", err)
    return NextResponse.json({ error: "Bank API unavailable" }, { status: 502, headers: corsHeaders })
  }
}
