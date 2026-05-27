import { NextRequest, NextResponse } from "next/server"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const clientId = await getClientSession()
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const brands = await prisma.brandProfile.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json({ brands })
}

export async function POST(req: NextRequest) {
  const clientId = await getClientSession()
  if (!clientId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { companyName, websiteUrl, niche, alternativeNames, competitors, customPrompts } = body

  if (!companyName || !websiteUrl) {
    return NextResponse.json({ error: "companyName and websiteUrl are required" }, { status: 400 })
  }

  const brand = await prisma.brandProfile.create({
    data: {
      clientId,
      companyName: String(companyName),
      websiteUrl: String(websiteUrl),
      niche: niche ? String(niche) : "",
      alternativeNames: Array.isArray(alternativeNames) ? alternativeNames.map(String) : [],
      competitors: Array.isArray(competitors) ? competitors.map(String) : [],
      customPrompts: Array.isArray(customPrompts) ? customPrompts : [],
    },
  })
  return NextResponse.json({ brand }, { status: 201 })
}
