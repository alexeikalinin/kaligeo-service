import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { z } from "zod"
import type { freemiumSequence } from "@/trigger/freemium-sequence"

const EmailSchema = z.object({
  scanId: z.string().cuid(),
  email: z.string().email(),
})

export async function POST(req: NextRequest) {
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
