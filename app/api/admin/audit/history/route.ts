import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { cookies } from "next/headers"

export async function GET(req: NextRequest) {
  const cookieStore = await cookies()
  if (cookieStore.get("admin_session")?.value !== process.env.ADMIN_SESSION_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const websiteUrl = req.nextUrl.searchParams.get("websiteUrl")
  if (!websiteUrl) {
    return NextResponse.json({ error: "websiteUrl is required" }, { status: 400 })
  }

  const jobs = await prisma.auditJob.findMany({
    where: {
      websiteUrl: { contains: websiteUrl.replace(/^https?:\/\//, "").split("/")[0] },
      status: "COMPLETED",
    },
    select: {
      id: true,
      companyName: true,
      tier: true,
      completedAt: true,
      report: { select: { overallScore: true } },
    },
    orderBy: { completedAt: "desc" },
    take: 10,
  })

  return NextResponse.json(
    jobs.map((j) => ({
      id: j.id,
      companyName: j.companyName,
      tier: j.tier,
      completedAt: j.completedAt,
      overallScore: j.report?.overallScore ?? null,
    }))
  )
}
