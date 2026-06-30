import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

/** Blocks SSRF — rejects private IPs, localhost, metadata endpoints */
function isSafeExternalUrl(rawUrl: string): boolean {
  try {
    const { protocol, hostname } = new URL(rawUrl)
    if (!["http:", "https:"].includes(protocol)) return false
    // Block localhost / loopback
    if (/^(localhost|127\.|0\.0\.0\.0)/.test(hostname)) return false
    // Block private RFC 1918 ranges
    if (/^10\./.test(hostname)) return false
    if (/^192\.168\./.test(hostname)) return false
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false
    // Block link-local (AWS/GCP metadata)
    if (/^169\.254\./.test(hostname)) return false
    // Block IPv6 loopback
    if (hostname === "::1" || hostname === "[::1]") return false
    return true
  } catch {
    return false
  }
}

export interface WebsiteAnalysisResult {
  companyName: string
  niche: string
  description: string
  services: string[]
  targetAudience: string
  keywords: string[]
  suggestedCompetitors: string[]
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 8000)
}

// Some sites front a bot-challenge: first request 307-redirects to itself with a
// Set-Cookie, and only a request carrying that cookie gets real content. Node's
// fetch has no implicit cookie jar, so the default `redirect: "follow"` loops
// forever. Handle one challenge hop manually, max 3 redirects total.
async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    let currentUrl = url
    let cookie: string | undefined
    for (let hop = 0; hop < 3; hop++) {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          "User-Agent": "KaliGEO-Bot/1.0 (brand visibility audit)",
          ...(cookie ? { Cookie: cookie } : {}),
        },
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location")
        const setCookie = res.headers.get("set-cookie")
        if (!location) return ""
        if (setCookie) cookie = setCookie.split(";")[0]
        currentUrl = new URL(location, currentUrl).toString()
        continue
      }

      if (!res.ok) return ""
      return stripHtml(await res.text())
    }
    return ""
  } catch {
    return ""
  } finally {
    clearTimeout(timeout)
  }
}

async function gatherPageContent(baseUrl: string): Promise<string> {
  const url = new URL(baseUrl)
  const origin = url.origin

  const paths = ["", "/about", "/о-компании", "/services", "/uslugi", "/products"]
  const texts = await Promise.all(
    paths.map((p) => fetchPageText(origin + p).catch(() => ""))
  )

  return texts
    .filter(Boolean)
    .join("\n\n---\n\n")
    .slice(0, 20000)
}

export async function runWebsiteAnalysisAgent(
  websiteUrl: string
): Promise<WebsiteAnalysisResult> {
  if (!isSafeExternalUrl(websiteUrl)) {
    throw new Error("Invalid or unsafe URL")
  }

  const pageContent = await gatherPageContent(websiteUrl)

  if (!pageContent) {
    console.error(`[website-analysis-agent] empty pageContent for ${websiteUrl}`)
    return {
      companyName: "",
      niche: "",
      description: "Не удалось получить контент сайта",
      services: [],
      targetAudience: "",
      keywords: [],
      suggestedCompetitors: [],
    }
  }

  const prompt = `Проанализируй текст сайта компании и верни JSON с ключевыми данными.

URL: ${websiteUrl}

Текст сайта:
${pageContent}

Верни ТОЛЬКО валидный JSON без markdown-блоков:
{
  "companyName": "название компании",
  "niche": "ниша и направление бизнеса (2-4 предложения: чем занимается, кто клиенты, какие проблемы решает)",
  "description": "краткое описание компании (1-2 предложения)",
  "services": ["список", "основных", "услуг/продуктов"],
  "targetAudience": "описание целевой аудитории",
  "keywords": ["ключевые", "слова", "по", "которым", "ищут"],
  "suggestedCompetitors": ["возможные", "конкуренты", "в", "нише"]
}`

  const { text } = await generateText({
    model: google("gemini-2.5-flash"),
    prompt,
    maxOutputTokens: 1500,
  })

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned) as WebsiteAnalysisResult
  } catch {
    console.error(`[website-analysis-agent] JSON parse failed for ${websiteUrl}, raw text: ${text.slice(0, 500)}`)
    return {
      companyName: "",
      niche: "",
      description: text.slice(0, 200),
      services: [],
      targetAudience: "",
      keywords: [],
      suggestedCompetitors: [],
    }
  }
}
