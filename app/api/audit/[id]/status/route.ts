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
      errorMessage: true,
      // reportToken intentionally excluded — exposed only via email link
    },
  })

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    ...job,
    // Report URL is delivered via email; do not expose here
    reportUrl: null,
  })
}
