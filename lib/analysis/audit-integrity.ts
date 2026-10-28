import { createHash } from "node:crypto"

export function answerId(jobId: string, platform: string, query: string): string {
  return `answer_${createHash("sha256").update(JSON.stringify([jobId, platform, query])).digest("hex")}`
}

export function checkCoverage(queries: string[], platforms: string[], results: { platform: string; query: string; response: string }[]) {
  return platforms.map(platform => ({
    platform,
    expected: queries.length,
    missing: queries.filter(query => !results.some(r => r.platform === platform && r.query === query && r.response.trim())),
  }))
}

export function uniqueAnswers<T extends { platform: string; query: string }>(rows: T[]): T[] {
  return [...new Map(rows.map(row => [JSON.stringify([row.platform, row.query]), row])).values()]
}
