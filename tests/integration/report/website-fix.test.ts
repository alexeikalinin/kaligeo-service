/**
 * Tests for POST /api/report/[id]/website-fix
 * Admin-only route, ADVANCED tier gate, runs website-fix-agent.
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

const mockRunWebsiteFixAgent = vi.fn().mockResolvedValue({
  fixes: [{ type: "schema", title: "Add Organization schema", html: "<script>...</script>" }],
})
vi.mock("@/lib/agents/website-fix-agent", () => ({
  runWebsiteFixAgent: (...a: unknown[]) => mockRunWebsiteFixAgent(...a),
}))

const mockCookiesGet = vi.fn()
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: (name: string) => mockCookiesGet(name),
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function withAdminCookie() {
  process.env.ADMIN_SESSION_TOKEN = "admin-secret"
  mockCookiesGet.mockImplementation((name: string) =>
    name === "admin_session" ? { value: "admin-secret" } : undefined
  )
}

function withoutAdminCookie() {
  mockCookiesGet.mockImplementation(() => undefined)
}

async function callWebsiteFix(id: string) {
  vi.resetModules()
  const { POST } = await import("@/app/api/report/[id]/website-fix/route")
  const req = new Request(`http://localhost/api/report/${id}/website-fix`, { method: "POST" })
  return POST(req as never, { params: Promise.resolve({ id }) })
}

const advancedJobWithReport = {
  id: "job-1",
  tier: "ADVANCED",
  companyName: "ACME",
  niche: "software",
  websiteUrl: "https://acme.com",
  competitors: ["Comp A"],
  report: {
    overallScore: 45,
    weakPoints: [],
    actionPlan: {},
    visibilityScores: {},
  },
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/report/[id]/website-fix", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withAdminCookie()
    mockRunWebsiteFixAgent.mockResolvedValue({
      fixes: [{ type: "schema", title: "Add Organization schema", html: "<script>...</script>" }],
    })
    mockJobFindUnique.mockResolvedValue(advancedJobWithReport)
  })

  it("returns agent result for ADVANCED tier with admin auth", async () => {
    const res = await callWebsiteFix("job-1")
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.fixes).toBeDefined()
    expect(json.fixes).toHaveLength(1)
  })

  it("passes correct job data to website-fix agent", async () => {
    await callWebsiteFix("job-1")
    expect(mockRunWebsiteFixAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        companyName: "ACME",
        websiteUrl: "https://acme.com",
      })
    )
  })

  it("returns 401 without admin session", async () => {
    withoutAdminCookie()
    const res = await callWebsiteFix("job-1")
    expect(res.status).toBe(401)
    expect(mockRunWebsiteFixAgent).not.toHaveBeenCalled()
  })

  it("returns 403 for STANDARD tier (no website fix)", async () => {
    mockJobFindUnique.mockResolvedValue({ ...advancedJobWithReport, tier: "STANDARD" })
    const res = await callWebsiteFix("job-1")
    expect(res.status).toBe(403)
    expect(mockRunWebsiteFixAgent).not.toHaveBeenCalled()
  })

  it("returns 403 for BASIC tier (no website fix)", async () => {
    mockJobFindUnique.mockResolvedValue({ ...advancedJobWithReport, tier: "BASIC" })
    const res = await callWebsiteFix("job-1")
    expect(res.status).toBe(403)
  })

  it("returns 404 when job not found", async () => {
    mockJobFindUnique.mockResolvedValue(null)
    const res = await callWebsiteFix("nonexistent")
    expect(res.status).toBe(404)
  })

  it("returns 400 when report not ready yet", async () => {
    mockJobFindUnique.mockResolvedValue({ ...advancedJobWithReport, report: null })
    const res = await callWebsiteFix("job-1")
    expect(res.status).toBe(400)
  })
})
