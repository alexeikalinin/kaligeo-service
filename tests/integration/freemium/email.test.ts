/**
 * Tests for POST /api/freemium/email
 * Captures email for freemium scan and triggers email sequence.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockScanFindUnique = vi.fn()
const mockScanUpdate     = vi.fn().mockResolvedValue({})
vi.mock("@/lib/prisma", () => ({
  prisma: {
    freemiumScan: {
      findUnique: (...a: unknown[]) => mockScanFindUnique(...a),
      update:     (...a: unknown[]) => mockScanUpdate(...a),
    },
  },
}))

const mockTasksTrigger = vi.fn().mockResolvedValue({ id: "seq-1" })
vi.mock("@trigger.dev/sdk/v3", () => ({
  tasks: { trigger: (...a: unknown[]) => mockTasksTrigger(...a) },
}))
vi.mock("@/trigger/freemium-sequence", () => ({ freemiumSequence: {} }))

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_SCAN_ID = "clxxxxxxxxxxxxxxxxxxxxxxxxx" // cuid-like

async function callFreemiumEmail(body: object) {
  vi.resetModules()
  const { POST } = await import("@/app/api/freemium/email/route")
  const req = new Request("http://localhost/api/freemium/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  return POST(req as never)
}

const activeScan = { id: VALID_SCAN_ID, emailCaptured: null }

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/freemium/email", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockScanFindUnique.mockResolvedValue(activeScan)
    mockScanUpdate.mockResolvedValue({})
    mockTasksTrigger.mockResolvedValue({ id: "seq-1" })
    mockScanUpdate.mockResolvedValue({})
    mockTasksTrigger.mockResolvedValue({ id: "seq-1" })
  })

  it("captures email and triggers sequence for valid request", async () => {
    const res = await callFreemiumEmail({ scanId: VALID_SCAN_ID, email: "user@example.com" })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockScanUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { emailCaptured: "user@example.com" } })
    )
    expect(mockTasksTrigger).toHaveBeenCalledWith(
      "send-freemium-sequence",
      { scanId: VALID_SCAN_ID, email: "user@example.com" }
    )
  })

  it("returns 200 idempotently when email already captured (no duplicate trigger)", async () => {
    mockScanFindUnique.mockResolvedValue({ ...activeScan, emailCaptured: "already@example.com" })
    const res = await callFreemiumEmail({ scanId: VALID_SCAN_ID, email: "user@example.com" })
    expect(res.status).toBe(200)
    expect(mockTasksTrigger).not.toHaveBeenCalled()
    expect(mockScanUpdate).not.toHaveBeenCalled()
  })

  it("returns 404 when scanId not found", async () => {
    mockScanFindUnique.mockResolvedValue(null)
    const res = await callFreemiumEmail({ scanId: VALID_SCAN_ID, email: "user@example.com" })
    expect(res.status).toBe(404)
  })

  it("returns 400 for invalid email", async () => {
    const res = await callFreemiumEmail({ scanId: VALID_SCAN_ID, email: "not-an-email" })
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid scanId format", async () => {
    const res = await callFreemiumEmail({ scanId: "not-a-cuid", email: "user@example.com" })
    expect(res.status).toBe(400)
  })

  it("returns 400 for missing fields", async () => {
    const res = await callFreemiumEmail({})
    expect(res.status).toBe(400)
  })
})
