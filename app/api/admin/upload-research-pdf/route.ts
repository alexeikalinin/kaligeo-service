import { NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { renderToBuffer } from "@react-pdf/renderer"
import { createElement } from "react"
import ResearchPDFDocument from "@/components/pdf/ResearchPDFDocument"

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("s")
  if (secret !== "kgeo-pdf-2026-upload") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const buffer = await renderToBuffer(createElement(ResearchPDFDocument))
  const blob = await put(
    "research/geo-russia-2026.pdf",
    Buffer.from(buffer),
    { access: "public", contentType: "application/pdf", addRandomSuffix: false }
  )
  return NextResponse.json({ url: blob.url })
}
