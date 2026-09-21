import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getMarketConfig, type Market } from "@/lib/market"

// GET /api/freemium/unsubscribe?scanId=xxx
// Clears emailCaptured so the freemium-sequence stops sending
export async function GET(req: NextRequest) {
  const scanId = req.nextUrl.searchParams.get("scanId")

  if (!scanId) {
    return new NextResponse("Ссылка недействительна", { status: 400 })
  }

  const scan = await prisma.freemiumScan.findUnique({ where: { id: scanId } })

  await prisma.freemiumScan.updateMany({
    where: { id: scanId },
    data: { emailCaptured: null },
  })

  const { landingUrl } = getMarketConfig((scan?.market as Market) ?? "ru")
  const landingHost = landingUrl.replace("https://", "")

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Отписка — KaliGEO</title></head>
    <body style="font-family:-apple-system,sans-serif;max-width:480px;margin:80px auto;padding:20px;text-align:center;color:#374151">
      <p style="font-family:monospace;font-weight:700;font-size:13px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:32px">KALIGEO</p>
      <h1 style="font-size:22px;font-weight:700;margin-bottom:12px">Вы отписались</h1>
      <p style="color:#6b7280;font-size:15px;line-height:1.6">Мы больше не будем присылать письма по результатам вашего скана.</p>
      <p style="color:#6b7280;font-size:14px;margin-top:24px">Если захотите — всегда можно вернуться на <a href="${landingUrl}" style="color:#111827;font-weight:600">${landingHost}</a></p>
    </body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  )
}
