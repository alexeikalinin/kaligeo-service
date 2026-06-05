import { task, tasks } from "@trigger.dev/sdk/v3"
import { prisma } from "../lib/prisma"
import type { freemiumSequence } from "./freemium-sequence"

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru"

export interface ContactScanPayload {
  websiteUrl: string
  email: string
  name: string
}

export const contactScan = task({
  id: "contact-scan",
  maxDuration: 900,
  retry: { maxAttempts: 1 },

  run: async ({ websiteUrl, email, name }: ContactScanPayload) => {
    // Reuse existing scan if done within last 24h
    const existing = await prisma.freemiumScan.findFirst({
      where: {
        websiteUrl,
        quickCheckDone: true,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    })

    let scanId: string

    if (existing) {
      scanId = existing.id
      if (!existing.emailCaptured) {
        await prisma.freemiumScan.update({
          where: { id: scanId },
          data: { emailCaptured: email },
        })
      }
    } else {
      // Делегируем скан в Vercel API — там есть все API-ключи платформ
      const resp = await fetch(`${APP_URL}/api/freemium/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl, source: "contact_form" }),
      })

      if (!resp.ok) {
        console.error("[contact-scan] freemium scan API failed:", resp.status, await resp.text())
        return
      }

      const { scanId: newScanId } = await resp.json() as { scanId: string }
      scanId = newScanId

      // Привязываем email к скану
      await prisma.freemiumScan.update({
        where: { id: scanId },
        data: { emailCaptured: email },
      })
    }

    await tasks.trigger<typeof freemiumSequence>("send-freemium-sequence", { scanId, email })
  },
})
