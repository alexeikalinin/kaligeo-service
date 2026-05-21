import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

async function callPerplexityAPI(prompt: string, systemPrompt: string) {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured")
  }
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
    }),
  })
  if (!response.ok) throw new Error(`Perplexity error: ${response.status}`)
  return await response.json()
}

export const perplexityClient: AIClient = {
  name: "Perplexity",
  isConfigured: () => !!process.env.PERPLEXITY_API_KEY,

  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const data = await callPerplexityAPI(prompt, systemPrompt)
    return data.choices?.[0]?.message?.content ?? ""
  },

  /** Perplexity возвращает структурированные citations[] — реальные URL-источники, использованные при генерации ответа */
  async queryWithSources(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const data = await callPerplexityAPI(prompt, systemPrompt)
    const response: string = data.choices?.[0]?.message?.content ?? ""
    // Perplexity API возвращает citations на верхнем уровне ответа
    const citations: string[] = Array.isArray(data.citations) ? data.citations : []
    return { response, citations }
  },
}
