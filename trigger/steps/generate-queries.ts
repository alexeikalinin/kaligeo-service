import OpenAI from "openai"
import { getQueryCountForTier, type Tier } from "../../lib/gates"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function generateQueries(
  companyName: string,
  niche: string,
  competitors: string[],
  tier: "BASIC" | "STANDARD" | "ADVANCED"
): Promise<string[]> {
  const count = getQueryCountForTier(tier as Tier)

  const prompt = `You are creating search queries for an AI visibility audit.

Company: ${companyName}
Niche/Industry: ${niche}
Known Competitors: ${competitors.join(", ")}

Generate exactly ${count} search queries that a potential customer would realistically ask an AI assistant like ChatGPT, Perplexity, or Claude when looking for products/services in this niche.

Requirements:
- Mix of Russian and English queries (60% Russian, 40% English)
- Include: recommendation queries ("What [service] do you recommend?"), comparison queries, specific use-case queries, location-based queries if relevant
- Queries should be natural conversational language, not keyword-stuffed
- Vary query length and type
- Some queries should be direct ("лучшая [ниша]?"), some indirect ("помоги выбрать...")

Return ONLY a JSON array of strings, no other text:
["query 1", "query 2", ...]`

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_tokens: 4000,
  })

  const text = response.choices[0]?.message?.content ?? "[]"
  const parsed = JSON.parse(text)
  const queries: string[] = Array.isArray(parsed) ? parsed : parsed.queries ?? []
  return queries.slice(0, count)
}
