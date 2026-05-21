import { AI_CLIENTS, ACTIVE_PLATFORMS } from "../../lib/ai-clients"
import { extractMentions } from "../../lib/analysis/extract-mentions"
import { prisma } from "../../lib/prisma"

export interface QueryExecutionResult {
  platform: string
  query: string
  response: string
  brandMentioned: boolean
  competitors: string[]
  sources: string[]
  sentiment: string
  positionScore: number
}

export async function executeQueriesOnPlatform(
  jobId: string,
  queries: string[],
  platform: string,
  companyName: string,
  websiteUrl: string,
  competitors: string[]
): Promise<QueryExecutionResult[]> {
  const aiClient = AI_CLIENTS[platform]
  if (!aiClient) throw new Error(`Unknown platform: ${platform}`)

  const results: QueryExecutionResult[] = []

  for (const query of queries) {
    try {
      // Приоритет: queryWithSources (Perplexity native citations) > query() + regex fallback
      let response: string
      let citationsFromApi: string[] | undefined

      if (aiClient.queryWithSources) {
        const structured = await aiClient.queryWithSources(query)
        response = structured.response
        citationsFromApi = structured.citations.length > 0 ? structured.citations : undefined
      } else {
        response = await aiClient.query(query)
      }

      const mentions = extractMentions(response, companyName, websiteUrl, competitors, citationsFromApi)

      const result: QueryExecutionResult = {
        platform,
        query,
        response,
        brandMentioned: mentions.brandMentioned,
        competitors: mentions.competitors,
        sources: mentions.sources,
        sentiment: mentions.sentiment,
        positionScore: mentions.positionScore,
      }

      // Persist immediately so we don't lose data on crashes
      await prisma.queryResult.create({
        data: {
          jobId,
          platform: platform as any,
          query,
          response,
          brandMentioned: mentions.brandMentioned,
          competitors: mentions.competitors,
          sources: mentions.sources,
          sentiment: mentions.sentiment,
          positionScore: mentions.positionScore,
          sourceCategories: mentions.sourceCategories as any,
        },
      })

      results.push(result)

      // Small delay to avoid rate limits
      await sleep(300)
    } catch (error) {
      console.error(`Error querying ${platform} for "${query}":`, error)
      // Continue with other queries — don't fail the whole batch
    }
  }

  return results
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
