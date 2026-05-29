import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generatePptx } from "@/lib/report/pptx-gen"

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

  if (!job || !job.report) {
    return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 })
  }
  if (job.reportToken !== token) {
    return NextResponse.json({ error: "Неверный токен" }, { status: 403 })
  }

  const report = job.report

  type PS = { platform: string; score: number; mentionCount: number; totalQueries: number; citationRate: number }
  type WP = { title: string; description: string; severity: "high" | "medium" | "low" }
  type AI = { title: string; description: string; effort?: string; impact?: string }
  type CE = { name: string; platforms?: string[]; mentionCount?: number }

  const actionPlanRaw = report.actionPlan as {
    strategy?: string
    "30d"?: AI[]
    "60d"?: AI[]
    "90d"?: AI[]
  }

  const buffer = await generatePptx({
    companyName: job.companyName,
    websiteUrl: job.websiteUrl,
    completedAt: job.completedAt,
    overallScore: report.overallScore,
    visibilityScores: report.visibilityScores as Record<string, PS>,
    weakPoints: (report.weakPoints as WP[]) ?? [],
    actionPlan: actionPlanRaw,
    competitorMatrix: (report.competitorMatrix as CE[]) ?? [],
  })

  const filename = `kaligeo-${job.companyName.replace(/[^a-zа-я0-9]/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pptx`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
