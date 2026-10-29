import {marketFromHost} from "@/lib/market"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import type { researchNurtureSequence } from "@/trigger/research-nurture-sequence"
import { z } from "zod"

const Schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  company: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const parsed = Schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректный email" }, { status: 400 })
  }

  const { email, company } = parsed.data
  const companyName = company?.trim() || email.split("@")[0]

  try {
    const existing = await prisma.lead.findFirst({ where: { email, source: "research-2026" } })
    const lead = existing ?? await prisma.lead.create({
      data: { email, companyName, source: "research-2026", status: "NEW" },
    })
    // A queue failure can be retried without sending a duplicate sequence.
    await tasks.trigger<typeof researchNurtureSequence>("send-research-nurture-sequence", {
      leadId: lead.id,
      market:marketFromHost(new URL(req.url).host),
      email,
      companyName: lead.companyName ?? companyName,
    }, { idempotencyKey: `research-${marketFromHost(new URL(req.url).host)}-${lead.id}` })
  } catch {
    return NextResponse.json({ error: "Не удалось принять заявку. Попробуйте ещё раз." }, { status: 503 })
  }

  return NextResponse.json({ success: true })
}
