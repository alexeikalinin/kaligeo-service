/**
 * Tests for POST /api/tools/domain-check
 * Rate-limited, runs 4 checks: robots.txt, llms.txt, schema.org, SSR.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockCheckRateLimit = vi.fn().mockResolvedValue(true)
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: (...a: unknown[]) => mockCheckRateLimit(...a),
}))

// Mock global fetch for external URL checks
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTextResponse(text: string, ok = true) {
  return { ok, status: ok ? 200 : 404, text: async () => text }
}

function setupFullyOptimizedSite() {
  mockFetch.mockImplementation(async (url: string) => {
    const u = url.toString()
    if (u.endsWith("/robots.txt")) {
      return makeTextResponse("User-agent: *\nAllow: /\nUser-agent: GPTBot\nAllow: /")
    }
    if (u.endsWith("/llms.txt")) {
      return makeTextResponse("# Company\nWe make great software.")
    }
    // Main page — has schema.org and SSR
    return makeTextResponse(
      `<html><head><title>Company</title></head><body><h1>Welcome</h1>
       <script type="application/ld+json">{"@type":"Organization","name":"Co"}</script>
       </body></html>`
    )
  })
}

async function callDomainCheck(body: object, ip = "1.2.3.4") {
  vi.resetModules()
  const { POST } = await import("@/app/api/tools/domain-check/route")
  const req = new Request("http://localhost/api/tools/domain-check", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  })
  return POST(req as never)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/tools/domain-check", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockResolvedValue(true)
  })

  it("returns 400 for missing URL", async () => {
    const res = await callDomainCheck({})
    expect(res.status).toBe(400)
  })

  it("returns 400 for URL with spaces (truly invalid after normalization)", async () => {
    const res = await callDomainCheck({ url: "not a url with spaces" })
    expect(res.status).toBe(400)
  })

  it("returns 400 for URL that is too long (>200 chars)", async () => {
    const res = await callDomainCheck({ url: "a".repeat(201) })
    expect(res.status).toBe(400)
  })

  it("returns 429 when rate limit exceeded", async () => {
    mockCheckRateLimit.mockResolvedValue(false)
    const res = await callDomainCheck({ url: "https://example.com" })
    expect(res.status).toBe(429)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("uses per-IP rate limit key", async () => {
    setupFullyOptimizedSite()
    await callDomainCheck({ url: "https://example.com" }, "5.5.5.5")
    expect(mockCheckRateLimit).toHaveBeenCalledWith("rl:domaincheck:5.5.5.5", 10, 60)
  })

  it("returns score=100 for fully optimized site", async () => {
    setupFullyOptimizedSite()
    const res = await callDomainCheck({ url: "https://example.com" })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.score).toBe(100)
    expect(json.checks).toHaveLength(4)
    expect(json.checks.every((c: { passed: boolean }) => c.passed)).toBe(true)
  })

  it("returns score=0 when all checks fail (site unreachable)", async () => {
    mockFetch.mockRejectedValue(new Error("ECONNREFUSED"))
    const res = await callDomainCheck({ url: "https://offline-site.example" })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.score).toBe(0)
    expect(json.checks.every((c: { passed: boolean }) => !c.passed)).toBe(true)
  })

  it("score increments by 25 per passing check", async () => {
    // Only robots.txt passes
    mockFetch.mockImplementation(async (url: string) => {
      const u = url.toString()
      if (u.endsWith("/robots.txt")) {
        return makeTextResponse("User-agent: GPTBot\nAllow: /")
      }
      if (u.endsWith("/llms.txt")) return makeTextResponse("", false)
      return makeTextResponse("<html><head></head><body></body></html>")
    })
    const res = await callDomainCheck({ url: "https://partial.example" })
    const json = await res.json()
    // robots passes (25) + schema fails (0) + ssr fails (0) + llms fails (0) = 25
    expect(json.score).toBe(25)
  })

  it("normalises URL without protocol (adds https://)", async () => {
    setupFullyOptimizedSite()
    const res = await callDomainCheck({ url: "example.com" })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe("https://example.com")
  })

  it("strips trailing slash from URL", async () => {
    setupFullyOptimizedSite()
    const res = await callDomainCheck({ url: "https://example.com/" })
    const json = await res.json()
    expect(json.url).toBe("https://example.com")
  })

  it("returns 4 checks with required fields", async () => {
    setupFullyOptimizedSite()
    const res = await callDomainCheck({ url: "https://example.com" })
    const json = await res.json()
    const ids = json.checks.map((c: { id: string }) => c.id)
    expect(ids).toContain("robots")
    expect(ids).toContain("llms")
    expect(ids).toContain("schema")
    expect(ids).toContain("ssr")
    for (const check of json.checks) {
      expect(check).toHaveProperty("label")
      expect(check).toHaveProperty("passed")
      expect(check).toHaveProperty("impact")
      expect(check).toHaveProperty("fixHint")
    }
  })

  it("robots check fails when Disallow: / is set for all agents", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const u = url.toString()
      if (u.endsWith("/robots.txt")) {
        return makeTextResponse("User-agent: *\nDisallow: /")
      }
      return makeTextResponse("", false)
    })
    const res = await callDomainCheck({ url: "https://blocked.example" })
    const json = await res.json()
    const robots = json.checks.find((c: { id: string }) => c.id === "robots")
    expect(robots.passed).toBe(false)
  })

  it("schema check passes for LocalBusiness type", async () => {
    mockFetch.mockImplementation(async (url: string) => {
      const u = url.toString()
      if (u.endsWith("/robots.txt") || u.endsWith("/llms.txt")) return makeTextResponse("", false)
      return makeTextResponse(
        `<title>Shop</title><h1>Shop</h1>
         <script type="application/ld+json">{"@type":"LocalBusiness"}</script>`
      )
    })
    const res = await callDomainCheck({ url: "https://shop.example" })
    const json = await res.json()
    const schema = json.checks.find((c: { id: string }) => c.id === "schema")
    expect(schema.passed).toBe(true)
  })
})
