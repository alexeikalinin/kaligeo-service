import type { AIClient } from "./types"
import { AUDIT_SYSTEM_PROMPT } from "./types"

interface GigaChatToken {
  value: string
  expiresAt: number
}

let cachedToken: GigaChatToken | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value
  }

  const clientId = process.env.GIGACHAT_CLIENT_ID
  const clientSecret = process.env.GIGACHAT_CLIENT_SECRET

  if (!clientId || !clientSecret) throw new Error("GigaChat credentials not configured")

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  // Sber uses a Russian CA certificate not trusted by Node.js by default.
  // Temporarily disable TLS verification only for this OAuth call.
  const prev = process.env.NODE_TLS_REJECT_UNAUTHORIZED
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

  let data: { access_token: string; expires_at: number }
  try {
    const res = await fetch("https://ngw.devices.sberbank.ru:9443/api/v2/oauth", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        RqUID: crypto.randomUUID(),
      },
      body: "scope=GIGACHAT_API_PERS",
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`GigaChat OAuth error ${res.status}: ${err}`)
    }

    data = await res.json()
  } finally {
    // Restore previous value immediately after the call
    if (prev === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev
    }
  }

  cachedToken = { value: data.access_token, expiresAt: data.expires_at }
  return data.access_token
}

export const gigachatClient: AIClient = {
  name: "GigaChat",
  isConfigured: () => !!(process.env.GIGACHAT_CLIENT_ID && process.env.GIGACHAT_CLIENT_SECRET),
  async query(prompt: string, systemPrompt = AUDIT_SYSTEM_PROMPT): Promise<string> {
    const token = await getAccessToken()

    const response = await fetch(
      "https://gigachat.devices.sberbank.ru/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "GigaChat",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt },
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`GigaChat error ${response.status}: ${error}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content ?? ""
  },
}
