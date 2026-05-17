import { generateText } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"

const google = createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_AI_API_KEY })

export interface WebsiteAnalysisResult {
  companyName: string
  niche: string
  description: string
  services: string[]
  targetAudience: string
  keywords: string[]
  suggestedCompetitors: string[]
}

async function fetchPageText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "KaliGEO-Bot/1.0 (brand visibility audit)" },
    })
    if (!res.ok) return ""
    const html = await res.text()
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000)
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
  const pageContent = await gatherPageContent(websiteUrl)

  if (!pageContent) {
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
    model: google("gemini-2.0-flash"),
    prompt,
    maxOutputTokens: 1500,
  })

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    return JSON.parse(cleaned) as WebsiteAnalysisResult
  } catch {
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
