/**
 * POST /api/payment/yookassa/webhook
 *
 * YooKassa notification (configured in the shop's dashboard → HTTP-уведомления).
 * YooKassa webhooks are NOT signed, so we never trust the request body for payment state —
 * we only use it to learn which payment id to re-fetch, then act on the server-side GET result.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { auditPipeline } from "@/trigger/audit-pipeline"
import { notifyAuditStarted } from "@/lib/notify"
import { getPayment } from "@/lib/billing/yookassa"
import { activateSubscriptionForJob } from "@/lib/billing/subscription"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { object?: { id?: string } } | null
  const paymentId = body?.object?.id

  if (!paymentId) {
    return NextResponse.json({ ok: false, error: "Missing payment id" }, { status: 400 })
  }

  const payment = await getPayment(paymentId)
  if (!payment) {
    console.error(`[payment/yookassa/webhook] Could not fetch payment ${paymentId}`)
    return NextResponse.json({ ok: false, error: "Payment not found" }, { status: 404 })
  }

  const succeeded = payment.paid || payment.status === "succeeded"
  if (!succeeded) {
    console.log(`[payment/yookassa/webhook] Ignoring payment ${paymentId} status=${payment.status}`)
    return NextResponse.json({ ok: true, ignored: true })
  }

  // We stored the YooKassa payment id as alfaBankOrderId (generic "provider order id" column)
  // when creating the order in /api/payment/create.
  const job = await prisma.auditJob.findFirst({
    where: { alfaBankOrderId: paymentId },
    select: { id: true, tier: true, companyName: true, paidAt: true, market: true, clientId: true },
  })

  if (!job) {
    console.error(`[payment/yookassa/webhook] No job found for payment ${paymentId}`)
    return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 })
  }

  if (job.paidAt) {
    return NextResponse.json({ ok: true, alreadyPaid: true })
  }

  const updated = await prisma.auditJob.updateMany({
    where: { id: job.id, paidAt: null },
    data: { paidAt: new Date(), status: "PENDING" },
  })

  if (updated.count > 0) {
    await tasks.trigger<typeof auditPipeline>("audit-pipeline", { jobId: job.id })
    notifyAuditStarted({ companyName: job.companyName, tier: job.tier, jobId: job.id }).catch(console.error)

    if (job.clientId) {
      const paymentMethodId = payment.payment_method?.saved ? payment.payment_method.id : undefined
      await activateSubscriptionForJob({
        jobId: job.id,
        clientId: job.clientId,
        tier: job.tier,
        market: "ru",
        provider: "yookassa",
        paymentMethodId,
      }).catch((err) => console.error("[payment/yookassa/webhook] activateSubscriptionForJob failed", err))
    }

    console.log(`[payment/yookassa/webhook] ✅ Payment confirmed for job ${job.id}, audit triggered`)
  }

  return NextResponse.json({ ok: true })
}
