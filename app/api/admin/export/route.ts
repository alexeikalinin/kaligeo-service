import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { prisma } from "@/lib/prisma"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
}

function escapeCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const jobs = await prisma.auditJob.findMany({
    orderBy: { createdAt: "desc" },
    include: { report: { select: { overallScore: true } } },
  })

  const headers = ["ID", "Компания", "Email", "Сайт", "Тариф", "Статус", "Оплата", "Score", "Создана", "Завершена"]
  const rows = jobs.map((j) => [
    j.id,
    j.companyName,
    j.clientEmail,
    j.websiteUrl ?? "",
    j.tier,
    j.status,
    j.paidAt ? j.paidAt.toISOString().slice(0, 10) : "",
    j.report?.overallScore ?? "",
    j.createdAt.toISOString().slice(0, 10),
    j.completedAt ? j.completedAt.toISOString().slice(0, 10) : "",
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCell).join(","))
    .join("\n")

  const filename = `kaligeo-export-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
