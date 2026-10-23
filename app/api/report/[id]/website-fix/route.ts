import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"
import { getClientSession } from "@/lib/client-session"
import { getTierConfig } from "@/lib/gates"
import { runWebsiteFixAgent } from "@/lib/agents/website-fix-agent"

export const maxDuration = 180

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const cookieStore = await cookies()
  const isAuthed =
    !!process.env.ADMIN_SESSION_TOKEN && cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN

  const { id } = await params

  const job = await prisma.auditJob.findUnique({
    where: { id },
    include: { report: true },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const clientId = await getClientSession()
  const token = new URL(req.url).searchParams.get("token")
  const isOwner = !!clientId && job.clientId === clientId
  const hasReportToken = !!token && token === job.reportToken
  if (!isAuthed && !isOwner && !hasReportToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  if (job.report.websiteFix) return NextResponse.json(job.report.websiteFix)

  try {
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

  await prisma.report.update({ where: { jobId: id }, data: { websiteFix: JSON.parse(JSON.stringify(result)) } })
  return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Не удалось подготовить рекомендации. Попробуйте ещё раз." }, { status: 502 })
  }
}
