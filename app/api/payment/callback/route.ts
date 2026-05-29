/**
 * POST /api/payment/callback
 *
 * Alfa-Bank server-side callback (push notification) after payment.
 * Configured in Alfa-Bank merchant portal → Callback уведомления.
 *
 * Bank sends (form-encoded):
 *   mdOrder      — bank's internal orderId
 *   orderNumber  — our jobId (set during register.do)
 *   operation    — "deposited" | "reversed" | "refunded" | ...
 *   status       — "1" = success, "0" = failure
 *   checksum     — HMAC-SHA256 signature (if Симметричный тип подписи)
 *
 * We verify checksum, then mark the job as paid and trigger the audit pipeline.
 */
import { NextRequest, NextResponse } from "next/server"
import { createHmac } from "crypto"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { auditPipeline } from "@/trigger/audit-pipeline"
import { notifyAuditStarted } from "@/lib/notify"

function verifyChecksum(params: Record<string, string>, token: string): boolean {
  const checksum = params["checksum"]
  if (!checksum) return false

  // Alfa-Bank HMAC: sorted key=value pairs joined by ";" then HMAC-SHA256
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== "checksum")
    .sort()

  const message = sortedKeys.map((k) => `${k};${params[k]}`).join(";")
  const expected = createHmac("sha256", token).update(message).digest("hex").toUpperCase()

  return expected === checksum.toUpperCase()
}

export async function POST(req: NextRequest) {
  const callbackToken = process.env.ALFABANK_CALLBACK_TOKEN

  // Parse form-encoded body
  const text = await req.text()
  const params: Record<string, string> = {}
  for (const [k, v] of new URLSearchParams(text)) {
    params[k] = v
  }

  // Support separate callback tokens for .by and .ru merchants
  // Bank sends merchant login in params — use it to pick the right token
  const merchantLogin = params["merchant_login"] ?? params["userName"] ?? ""
  const isRuMerchant = merchantLogin.toLowerCase().includes("kaligeo.ru")
  const callbackTokenRu = process.env.ALFABANK_CALLBACK_TOKEN_RU ?? callbackToken

  const tokenToUse = isRuMerchant ? (callbackTokenRu ?? callbackToken) : callbackToken

  // Verify signature if token is configured
  if (tokenToUse) {
    if (!verifyChecksum(params, tokenToUse)) {
      console.warn("[payment/callback] Invalid checksum", params)
      return NextResponse.json({ ok: false, error: "Invalid checksum" }, { status: 403 })
    }
  } else {
    console.warn("[payment/callback] ALFABANK_CALLBACK_TOKEN not set — skipping signature check")
  }

  const operation = params["operation"]
  const status = params["status"]
  const jobId = params["orderNumber"] // we set orderNumber = jobId in register.do

  // Only handle successful payment
  if (operation !== "deposited" || status !== "1") {
    console.log(`[payment/callback] Ignoring operation=${operation} status=${status}`)
    return NextResponse.json({ ok: true, ignored: true })
  }

  if (!jobId) {
    console.error("[payment/callback] Missing orderNumber in callback", params)
    return NextResponse.json({ ok: false, error: "Missing orderNumber" }, { status: 400 })
  }

  try {
    const job = await prisma.auditJob.findUnique({
      where: { id: jobId },
      select: { id: true, tier: true, companyName: true, paidAt: true },
    })

    if (!job) {
      console.error(`[payment/callback] Job not found: ${jobId}`)
      return NextResponse.json({ ok: false, error: "Job not found" }, { status: 404 })
    }

    if (job.paidAt) {
      // Already processed (e.g. via client-side polling) — idempotent, just ack
      return NextResponse.json({ ok: true, alreadyPaid: true })
    }

    const updated = await prisma.auditJob.updateMany({
      where: { id: jobId, paidAt: null },
      data: { paidAt: new Date(), status: "PENDING" },
    })

    if (updated.count > 0) {
      await tasks.trigger<typeof auditPipeline>("audit-pipeline", { jobId })
      notifyAuditStarted({
        companyName: job.companyName,
        tier: job.tier,
        jobId,
      }).catch(console.error)

      console.log(`[payment/callback] ✅ Payment confirmed for job ${jobId}, audit triggered`)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("[payment/callback] Error:", err)
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 })
  }
}
