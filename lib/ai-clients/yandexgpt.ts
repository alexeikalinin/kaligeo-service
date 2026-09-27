import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

// Yandex Cloud блокирует запросы с иностранных IP (Vercel/Trigger.dev), поэтому
// запросы идут через relay-сервер с российским/белорусским IP вместо прямого fetch.
export const yandexgptClient: AIClient = {
  name: "YandexGPT",
  isConfigured: () => !!(process.env.YANDEX_RELAY_URL && process.env.YANDEX_RELAY_SECRET),
  async query(prompt: string, systemPrompt = AUDIT_SYSTEM_PROMPT): Promise<string> {
    const relayUrl = process.env.YANDEX_RELAY_URL
    const relaySecret = process.env.YANDEX_RELAY_SECRET

    if (!relayUrl || !relaySecret) throw new Error("YandexGPT relay not configured")

    const response = await fetch(relayUrl, {
      method: "POST",
      headers: {
        "X-Relay-Secret": relaySecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "yandexgpt",
        prompt,
        systemPrompt,
        temperature: 0.3,
        maxTokens: 1000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`YandexGPT relay error ${response.status}: ${error}`)
    }

    const data = await response.json()
    return data.text ?? ""
  },
}
