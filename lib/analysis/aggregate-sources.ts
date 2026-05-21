import type { QueryResult } from "@prisma/client"
import type { SourceCategory } from "./extract-mentions"
import { categorizeDomain } from "./extract-mentions"

export interface DomainEntry {
  domain: string
  count: number
  category: SourceCategory
  urls: string[]
}

export interface SourcesReport {
  topDomains: DomainEntry[]
  byCategory: Record<SourceCategory, { urls: string[]; count: number }>
  totalSources: number
  competitorSourceAdvantage: {
    competitor: string
    uniqueDomains: string[]
    count: number
  }[]
}

export function aggregateSources(
  results: QueryResult[],
  websiteUrl: string,
  competitors: string[]
): SourcesReport {
  const domainMap: Map<string, { category: SourceCategory; urls: string[]; count: number }> = new Map()

  const byCategory: Record<SourceCategory, { urls: string[]; count: number }> = {
    official: { urls: [], count: 0 },
    catalog:  { urls: [], count: 0 },
    media:    { urls: [], count: 0 },
    expert:   { urls: [], count: 0 },
    social:   { urls: [], count: 0 },
    competitor: { urls: [], count: 0 },
    other:    { urls: [], count: 0 },
  }

  // Собираем все источники из результатов
  for (const r of results) {
    const sources = r.sources as string[]
    for (const url of sources) {
      try {
        const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`)
        const domain = urlObj.hostname.replace("www.", "").toLowerCase()
        const category = categorizeDomain(url, websiteUrl, competitors)

        // Domain map
        const existing = domainMap.get(domain)
        if (existing) {
          existing.count++
          if (!existing.urls.includes(url)) existing.urls.push(url)
        } else {
          domainMap.set(domain, { category, urls: [url], count: 1 })
        }

        // By category
        byCategory[category].count++
        if (!byCategory[category].urls.includes(url)) {
          byCategory[category].urls.push(url)
        }
      } catch {
        // skip malformed URLs
      }
    }
  }

  // Топ-15 доменов по частоте
  const topDomains: DomainEntry[] = Array.from(domainMap.entries())
    .map(([domain, data]) => ({ domain, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // Анализ преимущества конкурентов по источникам
  // Для каждого конкурента — домены, которые упоминаются в их контексте, но не у нас
  const competitorSourceAdvantage: SourcesReport["competitorSourceAdvantage"] = []

  for (const competitor of competitors) {
    // Результаты, где конкурент упомянут, но бренд клиента нет
    const competitorOnlyResults = results.filter(
      (r) => (r.competitors as string[]).includes(competitor) && !r.brandMentioned
    )
    const competitorDomains = new Set<string>()
    for (const r of competitorOnlyResults) {
      for (const url of r.sources as string[]) {
        try {
          const domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "")
          if (categorizeDomain(url, websiteUrl, competitors) !== "competitor") {
            competitorDomains.add(domain)
          }
        } catch { /* skip */ }
      }
    }
    if (competitorDomains.size > 0) {
      competitorSourceAdvantage.push({
        competitor,
        uniqueDomains: [...competitorDomains].slice(0, 10),
        count: competitorDomains.size,
      })
    }
  }

  const totalSources = Array.from(domainMap.values()).reduce((s, d) => s + d.count, 0)

  return { topDomains, byCategory, totalSources, competitorSourceAdvantage }
}
