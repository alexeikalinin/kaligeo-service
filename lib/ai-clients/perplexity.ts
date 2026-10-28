import { captureAiUsage } from "../analysis/ai-meter"
import type { AIClient,QueryOptions } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

async function callPerplexityAPI(prompt: string, systemPrompt: string,options?:QueryOptions) {
  if (!process.env.PERPLEXITY_API_KEY) {
    throw new Error("Perplexity API key not configured")
  }
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    signal:options?.signal,
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
  const data=await response.json()
  captureAiUsage({inputTokens:data.usage?.prompt_tokens,outputTokens:data.usage?.completion_tokens})
  return data
}

export const perplexityClient: AIClient = {
  name: "Perplexity",
  isConfigured: () => !!process.env.PERPLEXITY_API_KEY,

  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT, options) {
    const data = await callPerplexityAPI(prompt, systemPrompt,options)
    return data.choices?.[0]?.message?.content ?? ""
  },

  /** Perplexity возвращает структурированные citations[] — реальные URL-источники, использованные при генерации ответа */
  async queryWithSources(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT, options) {
    const data = await callPerplexityAPI(prompt, systemPrompt,options)
    const response: string = data.choices?.[0]?.message?.content ?? ""
    // Perplexity API возвращает citations на верхнем уровне ответа
    const citations: string[] = Array.isArray(data.citations) ? data.citations : []
    return { response, citations }
  },
}
