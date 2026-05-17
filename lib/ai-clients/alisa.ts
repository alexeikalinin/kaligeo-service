import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

// Алиса использует тот же YandexGPT API, но с моделью YandexGPT Lite
// оптимизированной под разговорный стиль
export const alisaClient: AIClient = {
  name: "Alisa",
  isConfigured: () => !!(process.env.YANDEXGPT_API_KEY && process.env.YANDEX_FOLDER_ID),
  async query(prompt: string, systemPrompt = AUDIT_SYSTEM_PROMPT): Promise<string> {
    const apiKey = process.env.YANDEXGPT_API_KEY
    const folderId = process.env.YANDEX_FOLDER_ID

    if (!apiKey || !folderId) throw new Error("YandexGPT/Alisa credentials not configured")

    const response = await fetch(
      "https://llm.api.cloud.yandex.net/foundationModels/v1/completion",
      {
        method: "POST",
        headers: {
          Authorization: `Api-Key ${apiKey}`,
          "x-folder-id": folderId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // YandexGPT Lite — облегчённая модель, ближе к Алисе
          modelUri: `gpt://${folderId}/yandexgpt-lite/latest`,
          completionOptions: {
            stream: false,
            temperature: 0.4,
            maxTokens: "1000",
          },
          messages: [
            { role: "system", text: systemPrompt },
            { role: "user", text: prompt },
          ],
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Alisa/YandexGPT-Lite error ${response.status}: ${error}`)
    }

    const data = await response.json()
    return data.result?.alternatives?.[0]?.message?.text ?? ""
  },
}
