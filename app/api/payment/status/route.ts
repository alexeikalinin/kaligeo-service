/**
 * GET /api/payment/status?jobId=<id>
 *
 * Verifies payment status for a given audit job via the provider used at order creation
 * (Alfa-Bank or YooKassa — see lib/billing/provider.ts). If payment is confirmed, sets
 * paidAt and triggers the audit pipeline. For MONITOR_* tiers, also activates the
 * associated Subscription (creating it if this is the first payment).
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { auditPipeline } from "@/trigger/audit-pipeline"
import { notifyAuditStarted } from "@/lib/notify"
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors"
import { getOrderStatus, getBindings, merchantForMarket, bindingEnabled } from "@/lib/billing/alfabank"
import { getPayment as getYooKassaPayment } from "@/lib/billing/yookassa"
import { resolveProvider } from "@/lib/billing/provider"
import { activateSubscriptionForJob } from "@/lib/billing/subscription"

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"))
}

export async function GET(req: NextRequest) {
  const origin = req.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get("jobId")

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400, headers: corsHeaders })
  }

  const job = await prisma.auditJob.findUnique({
    where: { id: jobId },
    select: { id: true, tier: true, companyName: true, paidAt: true, alfaBankOrderId: true, market: true, clientId: true },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404, headers: corsHeaders })
  }

  // Already paid — no need to call the provider again
  if (job.paidAt) {
    return NextResponse.json({ jobId, paid: true, alreadyPaid: true }, { headers: corsHeaders })
  }

  if (!job.alfaBankOrderId) {
    return NextResponse.json(
      { error: "Заказ ещё не создан. Сначала вызовите /api/payment/create." },
      { status: 400, headers: corsHeaders }
    )
  }

  const market = job.market === "ru" ? "ru" : "by"
  const provider = resolveProvider(market)

  let paid = false
  let errorCode: number | undefined
  let errorMessage: string | undefined
  let orderStatus: number | undefined
  let paymentMethodId: string | undefined

  try {
    if (provider === "yookassa") {
      const payment = await getYooKassaPayment(job.alfaBankOrderId)
      paid = !!payment && (payment.paid || payment.status === "succeeded")
      if (payment?.payment_method?.saved) paymentMethodId = payment.payment_method.id
      if (!payment) errorMessage = "YooKassa API unavailable"
    } else {
      const merchant = merchantForMarket(market)
      const result = await getOrderStatus(merchant, job.alfaBankOrderId)
      paid = result.paid
      orderStatus = result.orderStatus
      errorCode = result.errorCode
      errorMessage = result.errorMessage
    }
  } catch (err) {
    console.error("[payment/status]", err)
    return NextResponse.json({ error: "Bank API unavailable" }, { status: 502, headers: corsHeaders })
  }

  if (paid) {
    // Mark as paid and trigger audit pipeline (idempotent — check paidAt again)
    const updated = await prisma.auditJob.updateMany({
      where: { id: job.id, paidAt: null }, // only if not yet paid
      data: { paidAt: new Date(), status: "PENDING" },
    })

    if (updated.count > 0) {
      await tasks.trigger<typeof auditPipeline>("audit-pipeline", { jobId: job.id })
      notifyAuditStarted({
        companyName: job.companyName,
        tier: job.tier,
        jobId: job.id,
      }).catch(console.error)

      // Subscription tiers: activate (or create) the Subscription. Alfa binding is looked up
      // here (it's only available after a successful clientId-tagged payment); YooKassa's
      // saved payment_method_id, if any, was already read off the payment object above.
      if (job.clientId) {
        let bindingId: string | undefined
        if (provider === "alfabank" && bindingEnabled()) {
          const merchant = merchantForMarket(market)
          const binding = await getBindings(merchant, job.clientId)
          if (binding.ok) bindingId = binding.bindingId
        }
        await activateSubscriptionForJob({
          jobId: job.id,
          clientId: job.clientId,
          tier: job.tier,
          market,
          provider,
          bindingId,
          paymentMethodId,
        }).catch((err) => console.error("[payment/status] activateSubscriptionForJob failed", err))
      }
    }
  }

  return NextResponse.json(
    { jobId, paid, orderStatus, errorCode, errorMessage },
    { headers: corsHeaders }
  )
}
