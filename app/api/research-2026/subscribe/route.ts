import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import type { researchNurtureSequence } from "@/trigger/research-nurture-sequence"
import { z } from "zod"

const Schema = z.object({
  email: z.string().email(),
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

  // Дедупликация: не запускаем серию повторно для одного email
  const existing = await prisma.lead.findFirst({
    where: { email, source: "research-2026" },
  })
  if (existing) {
    return NextResponse.json({ success: true })
  }

  const lead = await prisma.lead.create({
    data: {
      email,
      companyName,
      source: "research-2026",
      status: "NEW",
    },
  })

  // Запускаем nurture-серию (письмо 1 — PDF — уходит немедленно внутри задачи)
  await tasks.trigger<typeof researchNurtureSequence>("send-research-nurture-sequence", {
    leadId: lead.id,
    email,
    companyName,
  })

  return NextResponse.json({ success: true })
}
