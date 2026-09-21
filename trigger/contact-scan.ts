import { task, tasks } from "@trigger.dev/sdk/v3"
import { prisma } from "../lib/prisma"
import type { freemiumSequence } from "./freemium-sequence"
import { getMarketConfig, type Market } from "../lib/market"

export interface ContactScanPayload {
  websiteUrl: string
  email: string
  name: string
  market?: Market
}

export const contactScan = task({
  id: "contact-scan",
  maxDuration: 900,
  retry: { maxAttempts: 1 },

  run: async ({ websiteUrl, email, name, market = "ru" }: ContactScanPayload) => {
    const { appUrl } = getMarketConfig(market)

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
      // This lead's own market always wins — a cached scan may have been
      // created by a visitor from the other domain and must not leak its
      // market into this lead's follow-up sequence.
      await prisma.freemiumScan.update({
        where: { id: scanId },
        data: { market, ...(existing.emailCaptured ? {} : { emailCaptured: email }) },
      })
    } else {
      // Делегируем скан в Vercel API — там есть все API-ключи платформ
      const resp = await fetch(`${appUrl}/api/freemium/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl, source: "contact_form", market }),
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
