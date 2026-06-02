/**
 * Tests for admin job management routes:
 *   DELETE /api/admin/jobs/[id]
 *   POST   /api/admin/jobs/[id]/confirm
 *   POST   /api/admin/jobs/[id]/restart
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockJobFindUnique    = vi.fn()
const mockJobUpdate        = vi.fn()
const mockJobDelete        = vi.fn()
const mockQueryResultDelete = vi.fn()
const mockReportDelete     = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditJob: {
      findUnique: (...a: unknown[]) => mockJobFindUnique(...a),
      update:     (...a: unknown[]) => mockJobUpdate(...a),
      delete:     (...a: unknown[]) => mockJobDelete(...a),
    },
    queryResult: {
      deleteMany: (...a: unknown[]) => mockQueryResultDelete(...a),
    },
    report: {
      deleteMany: (...a: unknown[]) => mockReportDelete(...a),
    },
  },
}))

const mockTasksTrigger = vi.fn().mockResolvedValue({ id: "run-1" })
vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger: (...a: unknown[]) => mockTasksTrigger(...a) },
}))
vi.mock("@/trigger/audit-pipeline", () => ({ auditPipeline: {} }))

vi.mock("@/lib/notify", () => ({
  notifyAuditStarted: vi.fn().mockResolvedValue(undefined),
}))

// Admin session cookie mock
const mockCookiesGet = vi.fn()
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockImplementation(async () => ({
    get: (name: string) => mockCookiesGet(name),
  })),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function withAdminCookie() {
  process.env.ADMIN_SESSION_TOKEN = "secret-token"
  mockCookiesGet.mockImplementation((name: string) =>
    name === "admin_session" ? { value: "secret-token" } : undefined
  )
}

function withoutAdminCookie() {
  mockCookiesGet.mockImplementation(() => undefined)
}

async function callDelete(id: string) {
  vi.resetModules()
  const mod = await import("@/app/api/admin/jobs/[id]/route")
  const req = new Request(`http://localhost/api/admin/jobs/${id}`, { method: "DELETE" })
  return mod.DELETE(req as never, { params: Promise.resolve({ id }) })
}

async function callConfirm(id: string, body: object = {}) {
  vi.resetModules()
  const mod = await import("@/app/api/admin/jobs/[id]/confirm/route")
  const req = new Request(`http://localhost/api/admin/jobs/${id}/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  return mod.POST(req as never, { params: Promise.resolve({ id }) })
}

async function callRestart(id: string) {
  vi.resetModules()
  const mod = await import("@/app/api/admin/jobs/[id]/restart/route")
  const req = new Request(`http://localhost/api/admin/jobs/${id}/restart`, { method: "POST" })
  return mod.POST(req as never, { params: Promise.resolve({ id }) })
}

const sampleJob = {
  id: "job-1",
  companyName: "ACME",
  tier: "STANDARD",
  status: "PENDING_PAYMENT",
  paidAt: null,
  errorMessage: null,
}

// ── DELETE /api/admin/jobs/[id] ───────────────────────────────────────────────

describe("DELETE /api/admin/jobs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withAdminCookie()
    mockTasksTrigger.mockResolvedValue({ id: "run-1" })
    mockJobFindUnique.mockResolvedValue(sampleJob)
    mockQueryResultDelete.mockResolvedValue({})
    mockReportDelete.mockResolvedValue({})
    mockJobDelete.mockResolvedValue({})
  })

  it("deletes job and related records, returns ok", async () => {
    const res = await callDelete("job-1")
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.deleted).toBe("job-1")
    expect(mockQueryResultDelete).toHaveBeenCalled()
    expect(mockReportDelete).toHaveBeenCalled()
    expect(mockJobDelete).toHaveBeenCalled()
  })

  it("returns 404 when job not found", async () => {
    mockJobFindUnique.mockResolvedValue(null)
    const res = await callDelete("nonexistent")
    expect(res.status).toBe(404)
  })

  it("returns 401 without admin session", async () => {
    withoutAdminCookie()
    const res = await callDelete("job-1")
    expect(res.status).toBe(401)
    expect(mockJobDelete).not.toHaveBeenCalled()
  })
})

// ── POST /api/admin/jobs/[id]/confirm ─────────────────────────────────────────

describe("POST /api/admin/jobs/[id]/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withAdminCookie()
    mockTasksTrigger.mockResolvedValue({ id: "run-1" })
    mockJobFindUnique.mockResolvedValue(sampleJob)
    mockJobUpdate.mockResolvedValue({})
  })

  it("confirms payment, updates tier, triggers pipeline", async () => {
    const res = await callConfirm("job-1", { tier: "ADVANCED" })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ paidAt: expect.any(Date), tier: "ADVANCED" }),
      })
    )
    expect(mockTasksTrigger).toHaveBeenCalledWith("audit-pipeline", { jobId: "job-1" })
  })

  it("confirms without changing tier when tier not provided", async () => {
    const res = await callConfirm("job-1", {})
    expect(res.status).toBe(200)
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ tier: expect.anything() }),
      })
    )
  })

  it("returns 400 when job is already confirmed (paidAt set)", async () => {
    mockJobFindUnique.mockResolvedValue({ ...sampleJob, paidAt: new Date() })
    const res = await callConfirm("job-1")
    expect(res.status).toBe(400)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
  })

  it("returns 404 when job not found", async () => {
    mockJobFindUnique.mockResolvedValue(null)
    const res = await callConfirm("nonexistent")
    expect(res.status).toBe(404)
  })

  it("returns 401 without admin session", async () => {
    withoutAdminCookie()
    const res = await callConfirm("job-1")
    expect(res.status).toBe(401)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
  })
})

// ── POST /api/admin/jobs/[id]/restart ─────────────────────────────────────────

describe("POST /api/admin/jobs/[id]/restart", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    withAdminCookie()
    mockTasksTrigger.mockResolvedValue({ id: "run-1" })
    mockJobFindUnique.mockResolvedValue({ ...sampleJob, status: "FAILED", errorMessage: "timeout" })
    mockJobUpdate.mockResolvedValue({})
  })

  it("restarts failed job and triggers pipeline", async () => {
    const res = await callRestart("job-1")
    expect(res.status).toBe(200)
    expect(mockJobUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "PENDING", errorMessage: null },
      })
    )
    expect(mockTasksTrigger).toHaveBeenCalledWith("audit-pipeline", { jobId: "job-1" })
  })

  it("returns 400 when job is not in FAILED state", async () => {
    mockJobFindUnique.mockResolvedValue({ ...sampleJob, status: "RUNNING" })
    const res = await callRestart("job-1")
    expect(res.status).toBe(400)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
  })

  it("returns 404 when job not found", async () => {
    mockJobFindUnique.mockResolvedValue(null)
    const res = await callRestart("nonexistent")
    expect(res.status).toBe(404)
  })

  it("returns 401 without admin session", async () => {
    withoutAdminCookie()
    const res = await callRestart("job-1")
    expect(res.status).toBe(401)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
  })
})
