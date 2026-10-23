import { AI_CLIENTS } from "../../lib/ai-clients"
import { extractMentions } from "../../lib/analysis/extract-mentions"
import { classifyMentionContext } from "../../lib/analysis/mention-extraction"
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
): Promise<{ results: QueryExecutionResult[]; failures: { query: string; error: string }[] }> {
  const aiClient = AI_CLIENTS[platform]
  if (!aiClient) throw new Error(`Unknown platform: ${platform}`)

  const results: QueryExecutionResult[] = []
  const failures: { query: string; error: string }[] = []

  let consecutiveFailures = 0
  for (const [queryIndex, query] of queries.entries()) {
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

      if (!response.trim()) throw new Error("Empty AI response")

      const mentions = extractMentions(response, companyName, websiteUrl, competitors, citationsFromApi)

      const mentionContext = classifyMentionContext(
        response,
        companyName,
        mentions.positionScore,
        mentions.sentiment
      )

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
          mentionContext: mentionContext ?? undefined,
        },
      })

      results.push(result)
      consecutiveFailures = 0

      // Small delay to avoid rate limits
      await sleep(300)
    } catch (error) {
      failures.push({ query, error: error instanceof Error ? `${error.name}: ${error.message}` : "Provider request failed" })
      console.error(`Error querying ${platform} for "${query}":`, error)
      consecutiveFailures++
      // A broken connection or key should not cost one failed call per question.
      if (consecutiveFailures >= 3) {
        failures.push(...queries.slice(queryIndex + 1).map(query => ({ query, error: "Skipped after repeated provider failures" })))
        break
      }
    }
  }

  return { results, failures }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
