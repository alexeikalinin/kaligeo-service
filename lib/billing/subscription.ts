/**
 * Shared logic for turning a successful MONITOR_* payment into an active Subscription row.
 * No-op for non-subscription tiers. Called from both the Alfa-Bank callback/status routes
 * and the YooKassa webhook — every path that can confirm a payment.
 */
import { prisma } from "@/lib/prisma"
import type { BillingProvider } from "./types"

const SUBSCRIPTION_TIERS = new Set(["MONITOR_START", "MONITOR_PRO", "MONITOR_AGENT"])

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000

export async function activateSubscriptionForJob(params: {
  jobId: string
  clientId: string
  tier: string
  market: string
  provider: BillingProvider
  bindingId?: string
  paymentMethodId?: string
}): Promise<void> {
  const { jobId, clientId, tier, market, provider, bindingId, paymentMethodId } = params

  if (!SUBSCRIPTION_TIERS.has(tier)) return

  const hasPaymentMethod = !!(bindingId || paymentMethodId)

  // One subscription per client+tier — reuse an existing non-canceled row if present
  // (e.g. retrying activation after a transient binding lookup failure).
  const existing = await prisma.subscription.findFirst({
    where: { clientId, tier, status: { not: "CANCELED" } },
    orderBy: { createdAt: "desc" },
  })

  const nextChargeAt = new Date(Date.now() + ONE_MONTH_MS)

  const subscription = existing
    ? await prisma.subscription.update({
        where: { id: existing.id },
        data: {
          status: hasPaymentMethod ? "ACTIVE" : "PENDING_FIRST_PAYMENT",
          bindingId: bindingId ?? existing.bindingId,
          paymentMethodId: paymentMethodId ?? existing.paymentMethodId,
          nextChargeAt: hasPaymentMethod ? (existing.nextChargeAt ?? nextChargeAt) : existing.nextChargeAt,
        },
      })
    : await prisma.subscription.create({
        data: {
          clientId,
          tier,
          market,
          provider,
          status: hasPaymentMethod ? "ACTIVE" : "PENDING_FIRST_PAYMENT",
          bindingId,
          paymentMethodId,
          nextChargeAt: hasPaymentMethod ? nextChargeAt : null,
        },
      })

  await prisma.auditJob.update({
    where: { id: jobId },
    data: { subscriptionId: subscription.id },
  })
}
