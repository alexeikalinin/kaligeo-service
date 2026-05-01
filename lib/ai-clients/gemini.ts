import { GoogleGenerativeAI } from "@google/generative-ai"
import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY ?? "")

export const geminiClient: AIClient = {
  name: "Gemini",
  async query(prompt, systemPrompt = AUDIT_SYSTEM_PROMPT) {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: systemPrompt,
    })
    const result = await model.generateContent(prompt)
    return result.response.text()
  },
}
