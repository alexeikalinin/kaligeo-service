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
    })
    const result = await model.generateContent(prompt)
    return result.response.text()
  },
}
