import { captureAiUsage } from "../analysis/ai-meter"
import { GoogleGenerativeAI } from "@google/generative-ai"
import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

export const geminiClient: AIClient = {
  name: "Gemini",
  isConfigured: () => !!process.env.GOOGLE_AI_API_KEY,
  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "")
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
      generationConfig:{maxOutputTokens:2048},
    })
    const result = await model.generateContent(prompt)
    captureAiUsage({inputTokens:result.response.usageMetadata?.promptTokenCount,outputTokens:result.response.usageMetadata?.totalTokenCount!==undefined&&result.response.usageMetadata?.promptTokenCount!==undefined?result.response.usageMetadata.totalTokenCount-result.response.usageMetadata.promptTokenCount:undefined})
    return result.response.text()
  },
}
