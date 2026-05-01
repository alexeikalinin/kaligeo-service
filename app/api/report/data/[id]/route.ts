import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get("token")

  const job = await prisma.auditJob.findUnique({
    where: { id },
    include: { report: true },
  })

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (job.reportToken !== token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (job.status !== "COMPLETED" || !job.report) {
    return NextResponse.json({ status: job.status, ready: false })
  }

  return NextResponse.json({
    ready: true,
    companyName: job.companyName,
    websiteUrl: job.websiteUrl,
    niche: job.niche,
    tier: job.tier,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    pdfUrl: job.pdfUrl,
    report: job.report,
  })
}
