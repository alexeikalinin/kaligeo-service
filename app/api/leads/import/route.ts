import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const LeadSchema = z.object({
  companyName: z.string().min(1),
  websiteUrl: z.string().url().optional(),
  email: z.string().email().optional(),
  niche: z.string().optional(),
  city: z.string().optional(),
  source: z.string().optional(),
})

const ImportSchema = z.object({
  leads: z.array(LeadSchema).min(1).max(500),
})

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-internal-secret")
  if (secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { leads } = ImportSchema.parse(body)

    let created = 0
    for (const lead of leads) {
      const existing = lead.websiteUrl
        ? await prisma.lead.findFirst({ where: { websiteUrl: lead.websiteUrl } })
        : null

      if (!existing) {
        await prisma.lead.create({
          data: {
            companyName: lead.companyName,
            websiteUrl: lead.websiteUrl,
            email: lead.email,
            niche: lead.niche,
            city: lead.city,
            source: lead.source ?? "csv",
          },
        })
        created++
      }
    }

    return NextResponse.json({ created, total: leads.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверный формат данных", details: error.issues }, { status: 400 })
    }
    console.error("Lead import error:", error)
    return NextResponse.json({ error: "Ошибка импорта" }, { status: 500 })
  }
}
