/**
 * POST /api/payment/create
 *
 * Creates an Alfa-Bank (Belarus) order for a given audit job.
 * Amount is determined SERVER-SIDE from the job's tier — never trusted from the client.
 *
 * Request body: { jobId: string }
 * Response: { orderId: string, formUrl: string }
 */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors"
import type { Tier } from "@/lib/gates"

const SANDBOX_URL = "https://sandbox.alfabank.by/payment/rest"
const PROD_URL = "https://ecom.alfabank.by/payment/rest"

/** Prices in BYN kopecks (1 BYN = 100 kopecks) — authoritative server-side table */
const TIER_PRICE_BYN_KOPECKS: Record<string, number> = {
  BASIC: 14900,          // 149 BYN
  STANDARD: 44900,       // 449 BYN
  ADVANCED: 89900,       // 899 BYN
  MONITOR_START: 14900,  // 149 BYN/мес
  MONITOR_PRO: 39900,    // 399 BYN/мес
  MONITOR_AGENT: 69900,  // 699 BYN/мес
}

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"))
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  const corsHeaders = getCorsHeaders(origin)

  const body = await req.json().catch(() => null)
  const { jobId } = body ?? {}

  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json(
      { error: "jobId is required" },
      { status: 400, headers: corsHeaders }
    )
  }

  // Look up job to get authoritative tier and validate it exists
  const job = await prisma.auditJob.findUnique({
    where: { id: jobId },
    select: { id: true, tier: true, companyName: true, paidAt: true, alfaBankOrderId: true },
  })

  if (!job) {
    return NextResponse.json(
      { error: "Заявка не найдена" },
      { status: 404, headers: corsHeaders }
    )
  }

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
  const amount = TIER_PRICE_BYN_KOPECKS[tier]

  if (!amount) {
    return NextResponse.json(
      { error: `Неверный тариф: ${tier}` },
      { status: 400, headers: corsHeaders }
    )
  }

  const isSandbox = process.env.ALFABANK_SANDBOX === "true"
  const baseUrl = isSandbox ? SANDBOX_URL : PROD_URL
  const byUrl = "https://kaligeo.by"

  const params = new URLSearchParams({
    userName: process.env.ALFABANK_USER ?? "",
    password: process.env.ALFABANK_PASS ?? "",
    orderNumber: job.id,                         // Use jobId as orderNumber (unique, traceable)
    amount: String(amount),
    currency: "933",                             // 933 = BYN (ISO 4217)
    returnUrl: `${byUrl}/?paymentStatus=success&jobId=${job.id}`,
    failUrl: `${byUrl}/?paymentStatus=fail&jobId=${job.id}`,
    description: `KaliGEO — аудит видимости ${job.companyName}, тариф ${tier}`,
    language: "ru",
    pageView: "DESKTOP",
  })

  try {
    const bankResp = await fetch(`${baseUrl}/register.do`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    })

    if (!bankResp.ok) throw new Error(`Bank API HTTP ${bankResp.status}`)

    const data = await bankResp.json() as {
      errorCode?: number
      errorMessage?: string
      orderId?: string
      formUrl?: string
    }

    if (data.errorCode && data.errorCode !== 0) {
      return NextResponse.json(
        { errorCode: data.errorCode, errorMessage: data.errorMessage ?? "Ошибка создания заказа" },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!data.orderId || !data.formUrl) {
      throw new Error("Bank returned no orderId or formUrl")
    }

    // Persist bank orderId so we can look up payment status later
    await prisma.auditJob.update({
      where: { id: job.id },
      data: { alfaBankOrderId: data.orderId },
    })

    return NextResponse.json(
      { orderId: data.orderId, formUrl: data.formUrl },
      { headers: corsHeaders }
    )
  } catch (err) {
    console.error("[payment/create]", err)
    return NextResponse.json(
      { error: "Bank API unavailable" },
      { status: 502, headers: corsHeaders }
    )
  }
}
