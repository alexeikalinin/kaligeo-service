import Anthropic from "@anthropic-ai/sdk"
import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const anthropicClient: AIClient = {
  name: "Claude",
  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })
    const block = response.content[0]
    return block.type === "text" ? block.text : ""
  },
}
