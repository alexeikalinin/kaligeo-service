import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

// Алиса использует тот же YandexGPT API, но с моделью YandexGPT Lite
// оптимизированной под разговорный стиль. Запросы идут через тот же relay-сервер,
// что и YandexGPT (Yandex Cloud блокирует запросы с иностранных IP Vercel/Trigger.dev).
export const alisaClient: AIClient = {
  name: "Alisa",
  isConfigured: () => !!(process.env.YANDEX_RELAY_URL && process.env.YANDEX_RELAY_SECRET),
  async query(prompt: string, systemPrompt = AUDIT_SYSTEM_PROMPT): Promise<string> {
    const relayUrl = process.env.YANDEX_RELAY_URL
    const relaySecret = process.env.YANDEX_RELAY_SECRET

    if (!relayUrl || !relaySecret) throw new Error("YandexGPT/Alisa relay not configured")

    const response = await fetch(relayUrl, {
      method: "POST",
      headers: {
        "X-Relay-Secret": relaySecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "yandexgpt-lite",
        prompt,
        systemPrompt,
        temperature: 0.4,
        maxTokens: 1000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Alisa relay error ${response.status}: ${error}`)
    }

    const data = await response.json()
    return data.text ?? ""
  },
}
