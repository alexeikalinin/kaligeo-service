import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Resend } from "resend"
import { checkRateLimit } from "@/lib/rate-limit"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  const ipAllowed = await checkRateLimit(`rl:recover:ip:${ip}`, 5, 3600)
  if (!ipAllowed) {
    return NextResponse.json({ success: true }) // Don't reveal rate limiting
  }

  const { email } = await req.json()
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 })
  }

  const jobs = await prisma.auditJob.findMany({
    where: {
      clientEmail: email.toLowerCase().trim(),
      status: "COMPLETED",
    },
    orderBy: { completedAt: "desc" },
    take: 5,
    select: {
      id: true,
      companyName: true,
      completedAt: true,
      reportToken: true,
      report: { select: { overallScore: true } },
    },
  })

  if (jobs.length === 0) {
    // Don't reveal that the email doesn't exist — always respond OK
    return NextResponse.json({ success: true })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""
  const reportLinks = jobs
    .map((j) => {
      const date = j.completedAt
        ? new Date(j.completedAt).toLocaleDateString("ru-RU")
        : ""
      const score = j.report?.overallScore ?? "—"
      const url = `${appUrl}/report/${j.id}?token=${j.reportToken}`
      return `<li style="margin-bottom:8px;"><a href="${url}" style="color:#0f172a;font-weight:600;">${j.companyName}</a> — Score: ${score}/100 (${date})</li>`
    })
    .join("")

  await resend.emails.send({
    from: process.env.FROM_EMAIL ?? "noreply@kaligeo.com",
    to: email,
    subject: "Ваши отчёты KaliGEO",
    html: `
<!DOCTYPE html>
<html>
<body style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:20px;color:#1a1a1a;">
  <h2 style="font-weight:700;margin-bottom:8px;">KALIGEO</h2>
  <p style="color:#666;margin-bottom:24px;">Ваши завершённые аудиты:</p>
  <ul style="padding-left:16px;line-height:2;">
    ${reportLinks}
  </ul>
  <p style="color:#999;font-size:12px;margin-top:32px;">
    Если вы не запрашивали это письмо — просто проигнорируйте его.
  </p>
</body>
</html>`,
  })

  return NextResponse.json({ success: true })
}
