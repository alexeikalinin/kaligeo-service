import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getTierConfig } from "@/lib/gates"
import { runWebsiteFixAgent } from "@/lib/agents/website-fix-agent"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN

  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const job = await prisma.auditJob.findUnique({
    where: { id },
    include: { report: true },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if (!job.report) {
    return NextResponse.json({ error: "Report not ready" }, { status: 400 })
  }

  const tierConfig = getTierConfig(job.tier as "BASIC" | "STANDARD" | "ADVANCED")
  if (!tierConfig.hasWebsiteFix) {
    return NextResponse.json(
      { error: "Website Fix не доступен на вашем тарифе" },
      { status: 403 }
    )
  }

  const result = await runWebsiteFixAgent({
    companyName: job.companyName,
    niche: job.niche,
    websiteUrl: job.websiteUrl,
    overallScore: job.report.overallScore,
    weakPoints: job.report.weakPoints,
    actionPlan: job.report.actionPlan,
    visibilityScores: job.report.visibilityScores,
    competitors: job.competitors,
  })

  return NextResponse.json(result)
}
