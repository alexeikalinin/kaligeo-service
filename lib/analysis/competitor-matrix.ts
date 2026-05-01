import type { QueryResult } from "@prisma/client"

export interface CompetitorEntry {
  name: string
  platforms: string[]
  mentionCount: number
  queries: string[]
}

export function buildCompetitorMatrix(
  results: QueryResult[],
  competitors: string[]
): CompetitorEntry[] {
  const matrix: Record<string, CompetitorEntry> = {}

  for (const competitor of competitors) {
    matrix[competitor] = {
      name: competitor,
      platforms: [],
      mentionCount: 0,
      queries: [],
    }
  }

  for (const result of results) {
    const foundCompetitors = result.competitors as string[]
    for (const comp of foundCompetitors) {
      if (!matrix[comp]) {
        matrix[comp] = { name: comp, platforms: [], mentionCount: 0, queries: [] }
      }
      matrix[comp].mentionCount++
      if (!matrix[comp].platforms.includes(result.platform)) {
        matrix[comp].platforms.push(result.platform)
      }
      if (!matrix[comp].queries.includes(result.query)) {
        matrix[comp].queries.push(result.query)
      }
    }
  }

  return Object.values(matrix).sort((a, b) => b.mentionCount - a.mentionCount)
}
