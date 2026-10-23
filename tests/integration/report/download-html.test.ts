/**
 * Tests for GET /api/report/[id]/download-html
 * Token-gated HTML report download.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockJobFindUnique = vi.fn()
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditJob: {
      findUnique: (...a: unknown[]) => mockJobFindUnique(...a),
    },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callDownloadHtml(id: string, token?: string) {
  vi.resetModules()
  const { GET } = await import("@/app/api/report/[id]/download-html/route")
  const { NextRequest } = await import("next/server")
  const url = `http://localhost/api/report/${id}/download-html${token ? `?token=${token}` : ""}`
  return GET(new NextRequest(new Request(url)), { params: Promise.resolve({ id }) })
}

const report = {
  overallScore: 55,
  visibilityScores: {
    CHATGPT: { platform: "ChatGPT", score: 60, citationRate: 0.4, mentionCount: 6, totalQueries: 15 },
  },
  weakPoints: [
    { id: "w1", title: "Low visibility", description: "Brand rarely mentioned", severity: "high" },
  ],
  actionPlan: {
    strategy: "Increase content production",
    quickWins: [{ action: "Add llms.txt", howTo: "Create file", timeEstimate: "1h", impact: "high" }],
    "30d": [],
    "60d": [],
    "90d": [],
  },
}

const jobWithReport = {
  id: "job-1",
  reportToken: "valid-token",
  companyName: "ACME Corp",
  report,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/report/[id]/download-html", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockJobFindUnique.mockResolvedValue(jobWithReport)
  })

  it("returns HTML content for valid token", async () => {
    const res = await callDownloadHtml("job-1", "valid-token")
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain("<!DOCTYPE html>")
    expect(text).toContain("KaliGEO")
  })

  it("returns 403 for wrong token", async () => {
    const res = await callDownloadHtml("job-1", "wrong-token")
    expect(res.status).toBe(403)
  })

  it("returns 403 when no token provided", async () => {
    const res = await callDownloadHtml("job-1")
    expect(res.status).toBe(403)
  })

  it("returns 404 when job not found", async () => {
    mockJobFindUnique.mockResolvedValue(null)
    const res = await callDownloadHtml("nonexistent", "any-token")
    expect(res.status).toBe(404)
  })

  it("returns 404 when report not ready", async () => {
    mockJobFindUnique.mockResolvedValue({ ...jobWithReport, report: null })
    const res = await callDownloadHtml("job-1", "valid-token")
    expect(res.status).toBe(404)
  })

  it("HTML includes company platform scores", async () => {
    const res = await callDownloadHtml("job-1", "valid-token")
    const text = await res.text()
    expect(text).toContain("ChatGPT")
    expect(text).toContain("60")
  })

  it("HTML includes weak points", async () => {
    const res = await callDownloadHtml("job-1", "valid-token")
    const text = await res.text()
    expect(text).toContain("Low visibility")
  })

  it("HTML includes strategy from action plan", async () => {
    const res = await callDownloadHtml("job-1", "valid-token")
    const text = await res.text()
    expect(text).toContain("Increase content production")
  })

  it("HTML includes quick wins section", async () => {
    const res = await callDownloadHtml("job-1", "valid-token")
    const text = await res.text()
    expect(text).toContain("Add llms.txt")
    expect(text).toContain("Быстрые действия")
  })
})


it("exports a Cyrillic company name with a valid HTTP attachment header", async () => {
  mockJobFindUnique.mockResolvedValue({ ...jobWithReport, companyName: "Игровой магазин", market: "by" })
  const response = await callDownloadHtml("job-1", "valid-token")
  expect(response.status).toBe(200)
  expect(response.headers.get("Content-Disposition")).toContain("filename*=UTF-8''")
  expect(await response.text()).toContain("kaligeo.by")
})

it("escapes company names and generated descriptions in the downloaded HTML", async () => {
  mockJobFindUnique.mockResolvedValue({ ...jobWithReport, companyName: "<script>alert(1)</script>", report: { ...report, actionPlan: { ...report.actionPlan, strategy: "<img src=x onerror=alert(1)>" } } })
  const response = await callDownloadHtml("job-1", "valid-token")
  const html = await response.text()
  expect(html).not.toContain("<script>alert(1)</script>")
  expect(html).not.toContain("<img src=x")
  expect(html).toContain("&lt;script&gt;")
})
