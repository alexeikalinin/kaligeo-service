import OpenAI from "openai"
import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

// DeepSeek uses OpenAI-compatible API
const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
})

export const deepseekClient: AIClient = {
  name: "DeepSeek",
  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
    })
    return response.choices[0]?.message?.content ?? ""
  },
}
