import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * GET /api/audit/history?email=X&companyName=Y&token=Z
 *
 * Возвращает историю аудитов для клиента в хронологическом порядке.
 * Token-gated: нужен действующий reportToken от любого из аудитов.
 */
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")
  const companyName = req.nextUrl.searchParams.get("companyName")
  const token = req.nextUrl.searchParams.get("token")

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 401 })
  }
  if (!email && !companyName) {
    return NextResponse.json({ error: "email or companyName required" }, { status: 400 })
  }

  // Проверяем, что token принадлежит одному из аудитов этого клиента
  const tokenCheck = await prisma.auditJob.findFirst({
    where: { reportToken: token },
    select: { clientEmail: true, companyName: true },
  })
  if (!tokenCheck) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 })
  }

  // Строим фильтр по email или названию компании
  const jobs = await prisma.auditJob.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        email ? { clientEmail: email } : undefined,
        companyName ? { companyName: { contains: companyName, mode: "insensitive" } } : undefined,
      ].filter(Boolean) as any,
    },
    include: {
      report: {
        select: {
          overallScore: true,
          visibilityScores: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  const points = jobs
    .filter((j) => j.report !== null)
    .map((j) => ({
      id: j.id,
      tier: j.tier,
      createdAt: j.createdAt,
      completedAt: j.completedAt,
      overallScore: j.report!.overallScore,
      platformScores: j.report!.visibilityScores as Record<string, {
        platform: string
        score: number
        citationRate: number
        mentionCount: number
        totalQueries: number
      }>,
    }))

  return NextResponse.json({ points, total: points.length })
}
