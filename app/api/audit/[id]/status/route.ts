import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const job = await prisma.auditJob.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      tier: true,
      companyName: true,
      clientEmail: true,
      websiteUrl: true,
      niche: true,
      createdAt: true,
      completedAt: true,
      pdfUrl: true,
      errorMessage: true,
      reportToken: true,
    },
  })

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    ...job,
    reportUrl:
      job.status === "COMPLETED"
        ? `${process.env.NEXT_PUBLIC_APP_URL}/report/${job.id}?token=${job.reportToken}`
        : null,
  })
}
