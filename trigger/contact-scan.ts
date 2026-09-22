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
  retry: { maxAttempts: 3, minTimeoutInMs: 3_000, maxTimeoutInMs: 20_000, factor: 2 },

  run: async ({ websiteUrl, email, name, market = "ru" }: ContactScanPayload) => {
    const { appUrl } = getMarketConfig(market)

    // Reuse existing scan for THIS market if done within last 24h. Scoped by
    // market so a .ru and a .by lead for the same site never share (and race
    // to overwrite) one another's scan record.
    const existing = await prisma.freemiumScan.findFirst({
      where: {
        websiteUrl,
        market,
        quickCheckDone: true,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    })

    let scanId: string

    if (existing) {
      scanId = existing.id
      if (!existing.emailCaptured) {
        await prisma.freemiumScan.update({ where: { id: scanId }, data: { emailCaptured: email } })
      }
    } else {
      // Делегируем скан в Vercel API — там есть все API-ключи платформ.
      // Не глотаем сбои молча: бросаем ошибку, чтобы сработал retry задачи
      // (иначе временный сбой домена/DNS/сертификата теряет лида навсегда).
      let resp: Response
      try {
        resp = await fetch(`${appUrl}/api/freemium/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ websiteUrl, source: "contact_form", market }),
        })
      } catch (err) {
        throw new Error(`[contact-scan] freemium scan fetch failed for market=${market}: ${err instanceof Error ? err.message : String(err)}`)
      }

      if (!resp.ok) {
        throw new Error(`[contact-scan] freemium scan API failed for market=${market}: ${resp.status} ${await resp.text()}`)
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
