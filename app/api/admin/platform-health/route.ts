import { NextResponse } from "next/server"
import { cookies } from "next/headers"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
}

export type PlatformStatus = "ok" | "error" | "unconfigured"

export interface PlatformHealthResult {
  key: string
  name: string
  status: PlatformStatus
  balance?: string       // e.g. "10.50 CNY" — only where API available
  balanceRaw?: number    // numeric for coloring
  error?: string
  dashboardUrl: string
  hasBalanceApi: boolean
  checkedAt: string
}

async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timeout")), ms)
    ),
  ])
}

async function checkOpenAI(): Promise<Omit<PlatformHealthResult, "key" | "name" | "dashboardUrl" | "hasBalanceApi" | "checkedAt">> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return { status: "unconfigured" }
  try {
    const res = await withTimeout(fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    }))
    if (res.ok) return { status: "ok" }
    const data = await res.json().catch(() => ({}))
    return { status: "error", error: data?.error?.message ?? `HTTP ${res.status}` }
  } catch (e) {
    return { status: "error", error: String(e) }
  }
}

async function checkAnthropic(): Promise<Omit<PlatformHealthResult, "key" | "name" | "dashboardUrl" | "hasBalanceApi" | "checkedAt">> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return { status: "unconfigured" }
  try {
    const res = await withTimeout(fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
    }))
    if (res.ok) return { status: "ok" }
    const data = await res.json().catch(() => ({}))
    return { status: "error", error: data?.error?.message ?? `HTTP ${res.status}` }
  } catch (e) {
    return { status: "error", error: String(e) }
  }
}

async function checkGemini(): Promise<Omit<PlatformHealthResult, "key" | "name" | "dashboardUrl" | "hasBalanceApi" | "checkedAt">> {
  const key = process.env.GOOGLE_AI_API_KEY
  if (!key) return { status: "unconfigured" }
  try {
    const res = await withTimeout(fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    ))
    if (res.ok) return { status: "ok" }
    const data = await res.json().catch(() => ({}))
    return { status: "error", error: data?.error?.message ?? `HTTP ${res.status}` }
  } catch (e) {
    return { status: "error", error: String(e) }
  }
}

async function checkPerplexity(): Promise<Omit<PlatformHealthResult, "key" | "name" | "dashboardUrl" | "hasBalanceApi" | "checkedAt">> {
  const key = process.env.PERPLEXITY_API_KEY
  if (!key) return { status: "unconfigured" }
  // Perplexity не имеет /models — делаем минимальный chat completion
  try {
    const res = await withTimeout(fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 16,
      }),
    }))
    if (res.ok) return { status: "ok" }
    const data = await res.json().catch(() => ({}))
    return { status: "error", error: data?.error?.message ?? `HTTP ${res.status}` }
  } catch (e) {
    return { status: "error", error: String(e) }
  }
}

async function checkDeepSeek(): Promise<Omit<PlatformHealthResult, "key" | "name" | "dashboardUrl" | "hasBalanceApi" | "checkedAt">> {
  const key = process.env.DEEPSEEK_API_KEY
  if (!key) return { status: "unconfigured" }
  try {
    const res = await withTimeout(fetch("https://api.deepseek.com/user/balance", {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    }))
    if (!res.ok) return { status: "error", error: `HTTP ${res.status}` }
    const data = await res.json()
    if (!data.is_available) return { status: "error", error: "Balance unavailable" }
    const info = data.balance_infos?.[0]
    const amount = parseFloat(info?.total_balance ?? "0")
    return {
      status: "ok",
      balance: `${info?.total_balance ?? "?"} ${info?.currency ?? "CNY"}`,
      balanceRaw: amount,
    }
  } catch (e) {
    return { status: "error", error: String(e) }
  }
}

async function checkGrok(): Promise<Omit<PlatformHealthResult, "key" | "name" | "dashboardUrl" | "hasBalanceApi" | "checkedAt">> {
  const key = process.env.GROK_API_KEY
  if (!key) return { status: "unconfigured" }
  try {
    const res = await withTimeout(fetch("https://api.x.ai/v1/models", {
      headers: { Authorization: `Bearer ${key}` },
    }))
    if (res.ok) return { status: "ok" }
    return { status: "error", error: `HTTP ${res.status}` }
  } catch (e) {
    return { status: "error", error: String(e) }
  }
}

function checkEnvOnly(keys: string[]): Omit<PlatformHealthResult, "key" | "name" | "dashboardUrl" | "hasBalanceApi" | "checkedAt"> {
  const allSet = keys.every((k) => !!process.env[k])
  return allSet ? { status: "ok" } : { status: "unconfigured" }
}

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const checkedAt = new Date().toISOString()

  const PLATFORMS: Array<{
    key: string
    name: string
    dashboardUrl: string
    hasBalanceApi: boolean
    check: () => Promise<Omit<PlatformHealthResult, "key" | "name" | "dashboardUrl" | "hasBalanceApi" | "checkedAt">>
  }> = [
    { key: "CHATGPT",    name: "ChatGPT",    dashboardUrl: "https://platform.openai.com/usage",          hasBalanceApi: false, check: checkOpenAI },
    { key: "CLAUDE",     name: "Claude",     dashboardUrl: "https://console.anthropic.com/settings/usage", hasBalanceApi: false, check: checkAnthropic },
    { key: "GEMINI",     name: "Gemini",     dashboardUrl: "https://aistudio.google.com",                 hasBalanceApi: false, check: checkGemini },
    { key: "PERPLEXITY", name: "Perplexity", dashboardUrl: "https://www.perplexity.ai/settings/api",      hasBalanceApi: false, check: checkPerplexity },
    { key: "DEEPSEEK",   name: "DeepSeek",   dashboardUrl: "https://platform.deepseek.com/usage",         hasBalanceApi: true,  check: checkDeepSeek },
    { key: "GROK",       name: "Grok",       dashboardUrl: "https://console.x.ai",                        hasBalanceApi: false, check: checkGrok },
    { key: "YANDEXGPT",  name: "YandexGPT",  dashboardUrl: "https://console.yandex.cloud/billing",        hasBalanceApi: false, check: async () => checkEnvOnly(["YANDEXGPT_API_KEY", "YANDEX_FOLDER_ID"]) },
    { key: "GIGACHAT",   name: "GigaChat",   dashboardUrl: "https://developers.sber.ru/studio",           hasBalanceApi: false, check: async () => checkEnvOnly(["GIGACHAT_CLIENT_ID", "GIGACHAT_CLIENT_SECRET"]) },
    { key: "ALISA",      name: "Алиса",      dashboardUrl: "https://console.yandex.cloud/billing",        hasBalanceApi: false, check: async () => checkEnvOnly(["YANDEXGPT_API_KEY", "YANDEX_FOLDER_ID"]) },
  ]

  const results = await Promise.allSettled(
    PLATFORMS.map(async (p) => {
      const result = await p.check()
      return { key: p.key, name: p.name, dashboardUrl: p.dashboardUrl, hasBalanceApi: p.hasBalanceApi, checkedAt, ...result } as PlatformHealthResult
    })
  )

  const data = results.map((r, i) => {
    if (r.status === "fulfilled") return r.value
    return {
      key: PLATFORMS[i].key,
      name: PLATFORMS[i].name,
      dashboardUrl: PLATFORMS[i].dashboardUrl,
      hasBalanceApi: PLATFORMS[i].hasBalanceApi,
      status: "error" as PlatformStatus,
      error: String(r.reason),
      checkedAt,
    }
  })

  return NextResponse.json(data)
}
