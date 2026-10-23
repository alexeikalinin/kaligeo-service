import { NextRequest, NextResponse } from "next/server"
import { getCorsHeaders, corsOptionsResponse } from "@/lib/cors"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { z } from "zod"
import type { freemiumSequence } from "@/trigger/freemium-sequence"

const EmailSchema = z.object({
  scanId: z.string().cuid(),
  email: z.string().email(),
})

async function handlePost(req: NextRequest) {
  try {
    const body = await req.json()
    const { scanId, email } = EmailSchema.parse(body)

    const scan = await prisma.freemiumScan.findUnique({ where: { id: scanId } })
    if (!scan) {
      return NextResponse.json({ error: "Скан не найден" }, { status: 404 })
    }

    // Idempotent — don't re-trigger if email already captured
    if (scan.emailCaptured) {
      return NextResponse.json({ success: true })
    }

    await prisma.freemiumScan.update({
      where: { id: scanId },
      data: { emailCaptured: email },
    })

    await tasks.trigger<typeof freemiumSequence>("send-freemium-sequence", { scanId, email })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверный email или scanId" }, { status: 400 })
    }
    console.error("Freemium email capture error:", error)
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 })
  }
}

export async function OPTIONS(req: NextRequest) {
  return corsOptionsResponse(req.headers.get("origin"))
}

export async function POST(req: NextRequest) {
  const response = await handlePost(req)
  new Headers(getCorsHeaders(req.headers.get("origin"))).forEach((value, key) => response.headers.set(key, value))
  response.headers.set("Vary", "Origin")
  return response
}
