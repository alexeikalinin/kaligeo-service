import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

function page(title: string, body: string) {
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title} — KaliGEO</title></head>
    <body style="font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:20px;text-align:center;color:#374151">
      <p style="font-family:monospace;font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:32px">KALIGEO</p>
      <h1 style="font-size:22px;font-weight:700;margin-bottom:12px">${title}</h1>
      <p style="color:#6b7280;font-size:15px;line-height:1.6">${body}</p>
      <p style="color:#6b7280;font-size:14px;margin-top:24px">Если захотите — всегда можно вернуться на <a href="https://kaligeo.ru" style="color:#111827;font-weight:600">kaligeo.ru</a></p>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}

// GET /api/audit/unsubscribe?jobId=xxx
// Sets emailOptOut on every AuditJob for the same clientEmail —
// stops post-audit, renewal, monitor-digest, monitoring-alerts, follow-up emails.
export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("jobId")

  if (!jobId) {
    return page("Ссылка недействительна", "Не указан идентификатор аудита.")
  }

  const job = await prisma.auditJob.findUnique({
    where: { id: jobId },
    select: { clientEmail: true },
  })

  if (!job) {
    return page("Ссылка недействительна", "Аудит не найден.")
  }

  await prisma.auditJob.updateMany({
    where: { clientEmail: job.clientEmail },
    data: { emailOptOut: true },
  })

  return page("Вы отписались", "Мы больше не будем присылать вам письма по аудитам и мониторингу AI-видимости.")
}
