import OpenAI from "openai"
import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export const openaiClient: AIClient = {
  name: "ChatGPT",
  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
    })
    return response.choices[0]?.message?.content ?? ""
  },
}
