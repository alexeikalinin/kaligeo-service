/**
 * GET /api/payment/status?jobId=<id>
 *
 * Verifies payment status for a given audit job via Alfa-Bank.
 * If payment is confirmed, sets paidAt and triggers the audit pipeline.
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { auditPipeline } from "@/trigger/audit-pipeline"
import { notifyAuditStarted } from "@/lib/notify"
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors"

const SANDBOX_URL = "https://sandbox.alfabank.by/payment/rest"
const PROD_URL = "https://ecom.alfabank.by/payment/rest"

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
    select: { id: true, tier: true, companyName: true, paidAt: true, alfaBankOrderId: true },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404, headers: corsHeaders })
  }

  // Already paid — no need to call bank again
  if (job.paidAt) {
    return NextResponse.json({ jobId, paid: true, alreadyPaid: true }, { headers: corsHeaders })
  }

  if (!job.alfaBankOrderId) {
    return NextResponse.json(
      { error: "Заказ ещё не создан. Сначала вызовите /api/payment/create." },
      { status: 400, headers: corsHeaders }
    )
  }

  const isSandbox = process.env.ALFABANK_SANDBOX === "true"
  const baseUrl = isSandbox ? SANDBOX_URL : PROD_URL

  const params = new URLSearchParams({
    userName: process.env.ALFABANK_USER ?? "",
    password: process.env.ALFABANK_PASS ?? "",
    orderId: job.alfaBankOrderId,
    language: "ru",
  })

  try {
    const bankResp = await fetch(`${baseUrl}/getOrderStatusExtended.do`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    })

    const data = await bankResp.json() as {
      orderStatus?: number
      errorCode?: number
      errorMessage?: string
      amount?: number
    }

    const paid = data.orderStatus === 2

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
      }
    }

    return NextResponse.json(
      {
        jobId,
        paid,
        orderStatus: data.orderStatus,
        errorCode: data.errorCode,
        errorMessage: data.errorMessage,
      },
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error("[payment/status]", err)
    return NextResponse.json({ error: "Bank API unavailable" }, { status: 502, headers: corsHeaders })
  }
}
