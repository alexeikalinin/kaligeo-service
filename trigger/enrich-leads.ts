import { task, wait } from "@trigger.dev/sdk/v3"
import { prisma } from "../lib/prisma"

export interface EnrichLeadsPayload {
  leadIds?: string[]
}

interface HunterResponse {
  data?: {
    emails?: Array<{ value: string; confidence: number; type: string }>
  }
}

export const enrichLeads = task({
  id: "enrich-leads",
  maxDuration: 300,
  retry: { maxAttempts: 1 },

  run: async ({ leadIds }: EnrichLeadsPayload) => {
    const apiKey = process.env.HUNTER_API_KEY
    if (!apiKey) {
      console.warn("[enrich-leads] HUNTER_API_KEY not set — skipping enrichment")
      return { enriched: 0 }
    }

    const leads = await prisma.lead.findMany({
      where: leadIds
        ? { id: { in: leadIds } }
        : { status: "NEW", websiteUrl: { not: null } },
      take: 50,
    })

    let enriched = 0

    for (const lead of leads) {
      if (!lead.websiteUrl) continue

      try {
        const domain = new URL(lead.websiteUrl).hostname.replace(/^www\./, "")
        const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&api_key=${apiKey}&limit=1`

        const res = await fetch(url)
        if (!res.ok) {
          console.warn(`[enrich-leads] Hunter error for ${domain}: ${res.status}`)
          continue
        }

        const data = (await res.json()) as HunterResponse
        const emails = data?.data?.emails ?? []

        const best = emails
          .filter((e) => e.type === "generic" || e.confidence > 70)
          .sort((a, b) => b.confidence - a.confidence)[0]

        if (best?.value) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: { enrichedEmail: best.value, status: "ENRICHED" },
          })
          enriched++
        }
      } catch (err) {
        console.error(`[enrich-leads] Failed for lead ${lead.id}:`, err)
      }

      // Hunter.io free tier: 1 req/sec
      await wait.for({ seconds: 1 })
    }

    return { enriched, total: leads.length }
  },
})
