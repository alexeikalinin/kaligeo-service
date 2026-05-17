import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { z } from "zod"
import type { coldSequence } from "@/trigger/cold-sequence"

const StartSchema = z.object({
  campaignId: z.string().cuid(),
})

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { campaignId } = StartSchema.parse(body)

    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } })
    if (!campaign) {
      return NextResponse.json({ error: "Кампания не найдена" }, { status: 404 })
    }

    const leads = await prisma.lead.findMany({
      where: {
        status: { in: ["NEW", "ENRICHED"] },
        ...(campaign.targetNiche ? { niche: { contains: campaign.targetNiche, mode: "insensitive" } } : {}),
        OR: [{ email: { not: null } }, { enrichedEmail: { not: null } }],
      },
      take: 30, // daily limit: stay within Resend free tier
    })

    for (const lead of leads) {
      await tasks.trigger<typeof coldSequence>("send-cold-sequence", {
        leadId: lead.id,
        campaignId,
      })
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "ACTIVE" },
    })

    return NextResponse.json({ triggered: leads.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверный campaignId" }, { status: 400 })
    }
    console.error("Campaign start error:", error)
    return NextResponse.json({ error: "Ошибка запуска кампании" }, { status: 500 })
  }
}
