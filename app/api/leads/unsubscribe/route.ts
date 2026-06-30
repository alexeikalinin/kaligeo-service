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

// GET /api/leads/unsubscribe?leadId=xxx
// Marks the lead UNSUBSCRIBED — stops cold-sequence and research-nurture-sequence.
export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get("leadId")

  if (!leadId) {
    return page("Ссылка недействительна", "Не указан идентификатор.")
  }

  await prisma.lead.updateMany({
    where: { id: leadId },
    data: { status: "UNSUBSCRIBED" },
  })

  return page("Вы отписались", "Мы больше не будем присылать вам письма.")
}
