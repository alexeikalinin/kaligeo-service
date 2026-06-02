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
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

// GET /api/admin/leads/retargeting?segment=all|hot|unconverted|noopen
export async function GET(req: NextRequest) {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const segment = req.nextUrl.searchParams.get("segment") ?? "all"

  const scans = await prisma.freemiumScan.findMany({
    where: { emailCaptured: { not: null } },
    orderBy: { createdAt: "desc" },
  })

  // Emails that converted to AuditJob
  const auditEmails = await prisma.auditJob.findMany({
    select: { clientEmail: true },
    distinct: ["clientEmail"],
  })
  const convertedSet = new Set(auditEmails.map((j) => j.clientEmail.toLowerCase()))

  // OutreachEmail open status by email
  const leads = await prisma.lead.findMany({
    where: { email: { not: null } },
    include: {
      outreachEmails: { select: { openedAt: true } },
    },
  })
  const openedSet = new Set(
    leads
      .filter((l) => l.outreachEmails.some((e) => e.openedAt !== null))
      .map((l) => l.email!.toLowerCase())
  )

  let rows = scans.filter((s) => s.emailCaptured)

  if (segment === "hot") {
    rows = rows.filter((s) => s.previewScore >= 50)
  } else if (segment === "unconverted") {
    rows = rows.filter((s) => !convertedSet.has(s.emailCaptured!.toLowerCase()))
  } else if (segment === "noopen") {
    rows = rows.filter(
      (s) =>
        !convertedSet.has(s.emailCaptured!.toLowerCase()) &&
        !openedSet.has(s.emailCaptured!.toLowerCase())
    )
  }

  const headers = ["Email", "Компания", "Сайт", "Score", "Ниша", "Источник", "Дата"]
  const csvRows = rows.map((s) => [
    s.emailCaptured,
    s.companyName,
    s.websiteUrl,
    s.previewScore,
    s.niche,
    s.source ?? "",
    s.createdAt.toISOString().slice(0, 10),
  ])

  const csv = [headers, ...csvRows].map((r) => r.map(escapeCell).join(",")).join("\n")
  const filename = `kaligeo-leads-${segment}-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
