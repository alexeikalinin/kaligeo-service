import { NextRequest, NextResponse } from "next/server"
import { checkRateLimit } from "@/lib/rate-limit"

export interface DomainCheckResult {
  id: string
  label: string
  passed: boolean
  impact: "high" | "medium" | "low"
  fixHint: string
}

export interface DomainCheckResponse {
  score: number
  url: string
  checks: DomainCheckResult[]
}

async function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    return await fetch(url, { signal: controller.signal, headers: { "User-Agent": "KaliGEO-DomainCheck/1.0" } })
  } finally {
    clearTimeout(timer)
  }
}

async function checkRobotsTxt(baseUrl: string): Promise<DomainCheckResult> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/robots.txt`)
    if (!res.ok) throw new Error("Not found")
    const text = await res.text()
    // Check for common AI bot user agents being allowed
    const lower = text.toLowerCase()
    const hasAiBot = lower.includes("gptbot") || lower.includes("claudebot") || lower.includes("anthropic-ai") || lower.includes("googlebot") || lower.includes("user-agent: *")
    const hasDisallowAll = /user-agent:\s*\*[\s\S]*?disallow:\s*\//i.test(text)
    const passed = hasAiBot && !hasDisallowAll

    return {
      id: "robots",
      label: "robots.txt — AI-боты разрешены",
      passed,
      impact: "high",
      fixHint: "Добавьте в robots.txt: `User-agent: GPTBot\\nAllow: /\\nUser-agent: ClaudeBot\\nAllow: /`",
    }
  } catch {
    return {
      id: "robots",
      label: "robots.txt — AI-боты разрешены",
      passed: false,
      impact: "high",
      fixHint: "Создайте файл robots.txt и добавьте правила для AI-ботов (GPTBot, ClaudeBot).",
    }
  }
}

async function checkLlmsTxt(baseUrl: string): Promise<DomainCheckResult> {
  try {
    const res = await fetchWithTimeout(`${baseUrl}/llms.txt`)
    const passed = res.ok && (await res.text()).trim().length > 0
    return {
      id: "llms",
      label: "llms.txt — файл для AI-ассистентов",
      passed,
      impact: "high",
      fixHint: "Создайте /llms.txt с кратким описанием компании, продуктов и ключевых страниц. Формат: markdown.",
    }
  } catch {
    return {
      id: "llms",
      label: "llms.txt — файл для AI-ассистентов",
      passed: false,
      impact: "high",
      fixHint: "Создайте /llms.txt — это прямой сигнал для AI о вашем бренде. Формат: markdown с описанием компании.",
    }
  }
}

async function checkSchemaOrg(baseUrl: string): Promise<DomainCheckResult> {
  try {
    const res = await fetchWithTimeout(baseUrl)
    const html = await res.text()
    const hasLdJson = html.includes(`"@type":"Organization"`) || html.includes(`"@type": "Organization"`) || html.includes(`"@type":"LocalBusiness"`) || html.includes(`"@type":"Product"`) || html.includes(`"@type": "Product"`)
    return {
      id: "schema",
      label: "Schema.org — структурированные данные",
      passed: hasLdJson,
      impact: "medium",
      fixHint: "Добавьте Schema.org разметку Organization или LocalBusiness в тег <script type='application/ld+json'>.",
    }
  } catch {
    return {
      id: "schema",
      label: "Schema.org — структурированные данные",
      passed: false,
      impact: "medium",
      fixHint: "Добавьте JSON-LD разметку с типом Organization на главную страницу сайта.",
    }
  }
}

async function checkSsr(baseUrl: string): Promise<DomainCheckResult> {
  try {
    const res = await fetchWithTimeout(baseUrl)
    const html = await res.text()
    const hasTitle = /<title[^>]*>[^<]{3,}<\/title>/i.test(html)
    const hasH1 = /<h1[^>]*>[^<]{2,}<\/h1>/i.test(html)
    const passed = hasTitle && hasH1
    return {
      id: "ssr",
      label: "SSR — контент виден без JavaScript",
      passed,
      impact: "medium",
      fixHint: "Убедитесь, что сайт рендерит <title> и <h1> на сервере. Если используете React/Vue — настройте SSR или SSG.",
    }
  } catch {
    return {
      id: "ssr",
      label: "SSR — контент виден без JavaScript",
      passed: false,
      impact: "medium",
      fixHint: "AI-боты часто не выполняют JavaScript. Настройте серверный рендеринг (SSR) или статическую генерацию (SSG).",
    }
  }
}

function normalizeUrl(raw: string): string {
  let url = raw.trim()
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`
  }
  // Remove trailing slash
  return url.replace(/\/$/, "")
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  const allowed = await checkRateLimit(`rl:domaincheck:${ip}`, 10, 60) // 10/min
  if (!allowed) {
    return NextResponse.json({ error: "Слишком много запросов." }, { status: 429 })
  }

  const body = await req.json().catch(() => ({}))
  const rawUrl = body?.url ?? ""
  if (!rawUrl || rawUrl.length > 200) {
    return NextResponse.json({ error: "Укажите URL сайта." }, { status: 400 })
  }

  let baseUrl: string
  try {
    baseUrl = normalizeUrl(rawUrl)
    new URL(baseUrl) // validate
  } catch {
    return NextResponse.json({ error: "Некорректный URL." }, { status: 400 })
  }

  const [robots, llms, schema, ssr] = await Promise.allSettled([
    checkRobotsTxt(baseUrl),
    checkLlmsTxt(baseUrl),
    checkSchemaOrg(baseUrl),
    checkSsr(baseUrl),
  ])

  const checks: DomainCheckResult[] = [
    robots.status === "fulfilled" ? robots.value : { id: "robots", label: "robots.txt", passed: false, impact: "high" as const, fixHint: "" },
    llms.status === "fulfilled" ? llms.value : { id: "llms", label: "llms.txt", passed: false, impact: "high" as const, fixHint: "" },
    schema.status === "fulfilled" ? schema.value : { id: "schema", label: "Schema.org", passed: false, impact: "medium" as const, fixHint: "" },
    ssr.status === "fulfilled" ? ssr.value : { id: "ssr", label: "SSR", passed: false, impact: "medium" as const, fixHint: "" },
  ]

  const score = checks.filter((c) => c.passed).length * 25

  return NextResponse.json({ score, url: baseUrl, checks } satisfies DomainCheckResponse)
}
