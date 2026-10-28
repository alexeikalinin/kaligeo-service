import { captureAiUsage } from "../analysis/ai-meter"
import Anthropic from "@anthropic-ai/sdk"
import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

export const anthropicClient: AIClient = {
  name: "Claude",
  isConfigured: () => !!process.env.ANTHROPIC_API_KEY,
  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const client = new Anthropic({ maxRetries:0, apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    })
    captureAiUsage({inputTokens:response.usage.input_tokens,outputTokens:response.usage.output_tokens})
    const block = response.content[0]
    return block?.type === "text" ? block.text : ""
  },
}
