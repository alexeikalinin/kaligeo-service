export interface SiteEvidence {
  checkedAt: string
  pages: { url: string; schemaFound: boolean }[]
  wikipedia: { status: "found" | "unverified"; urls: string[] }
}

export function hasStructuredData(html: string): boolean {
  return /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>[\s\S]*?schema\.org[\s\S]*?<\/script>/i.test(html)
    || /(?:itemtype|typeof)\s*=\s*["'][^"']*schema\.org\//i.test(html)
}

// Search hits are candidates, not proof that an article describes this company.
// Only an exact title match is recorded; absence/errors remain unverified.
export async function findWikipedia(companyName: string): Promise<SiteEvidence["wikipedia"]> {
  const urls: string[] = []
  await Promise.all(["ru", "en"].map(async lang => {
    try {
      const endpoint = new URL(`https://${lang}.wikipedia.org/w/api.php`)
      endpoint.search = new URLSearchParams({ action: "query", format: "json", list: "search", srsearch: companyName, srlimit: "5" }).toString()
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) return
      const data = await response.json()
      for (const hit of data.query?.search ?? []) {
        if (typeof hit.title === "string" && hit.title.toLocaleLowerCase() === companyName.trim().toLocaleLowerCase()) {
          urls.push(`https://${lang}.wikipedia.org/wiki/${encodeURIComponent(hit.title.replaceAll(" ", "_"))}`)
        }
      }
    } catch { /* A failed search is not evidence of absence. */ }
  }))
  return { status: urls.length ? "found" : "unverified", urls }
}
