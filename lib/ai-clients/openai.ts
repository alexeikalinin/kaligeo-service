import { captureAiUsage } from "../analysis/ai-meter"
import OpenAI from "openai"
import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

export const openaiClient: AIClient = {
  name: "ChatGPT",
  isConfigured: () => !!process.env.OPENAI_API_KEY,
  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const client = new OpenAI({ maxRetries:0, apiKey: process.env.OPENAI_API_KEY })
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
    })
    captureAiUsage({inputTokens:response.usage?.prompt_tokens,outputTokens:response.usage?.completion_tokens})
    return response.choices[0]?.message?.content ?? ""
  },
}
