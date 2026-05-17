import OpenAI from "openai"
import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

export const grokClient: AIClient = {
  name: "Grok",
  isConfigured: () => !!process.env.GROK_API_KEY,
  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const client = new OpenAI({
      apiKey: process.env.GROK_API_KEY,
      baseURL: "https://api.x.ai/v1",
    })
    const response = await client.chat.completions.create({
      model: "grok-3",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
    })
    return response.choices[0]?.message?.content ?? ""
  },
}
