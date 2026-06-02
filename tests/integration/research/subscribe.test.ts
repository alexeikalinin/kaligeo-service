/**
 * Tests for POST /api/research-2026/subscribe
 * Saves lead to DB + sends PDF email via Resend.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockLeadCreate = vi.fn().mockResolvedValue({ id: "lead-1" })
vi.mock("@/lib/prisma", () => ({
  prisma: {
    lead: {
      create: (...a: unknown[]) => mockLeadCreate(...a),
    },
  },
}))

const mockResendSend = vi.fn().mockResolvedValue({ data: {}, error: null })
vi.mock("resend", () => {
  class MockResend {
    emails = { send: (...a: unknown[]) => mockResendSend(...a) }
  }
  return { Resend: MockResend }
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callSubscribe(body: object) {
  vi.resetModules()
  const { POST } = await import("@/app/api/research-2026/subscribe/route")
  const req = new Request("http://localhost/api/research-2026/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  return POST(req as never)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/research-2026/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLeadCreate.mockResolvedValue({ id: "lead-1" })
    mockResendSend.mockResolvedValue({ data: {}, error: null })
  })

  it("returns 200 and sends email for valid request", async () => {
    const res = await callSubscribe({ email: "user@example.com" })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockResendSend).toHaveBeenCalledOnce()
  })

  it("creates a lead record in DB with source=research-2026", async () => {
    await callSubscribe({ email: "user@example.com", company: "ACME" })
    expect(mockLeadCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "user@example.com",
          source: "research-2026",
          status: "NEW",
        }),
      })
    )
  })

  it("uses email prefix as companyName when company not provided", async () => {
    await callSubscribe({ email: "brand@example.com" })
    expect(mockLeadCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyName: "brand" }),
      })
    )
  })

  it("sends email to the subscriber's address", async () => {
    await callSubscribe({ email: "sub@example.com" })
    expect(mockResendSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: "sub@example.com" })
    )
  })

  it("returns 400 for invalid email", async () => {
    const res = await callSubscribe({ email: "not-an-email" })
    expect(res.status).toBe(400)
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it("returns 400 for missing email", async () => {
    const res = await callSubscribe({})
    expect(res.status).toBe(400)
  })

  it("returns 500 when Resend returns an error", async () => {
    mockResendSend.mockResolvedValue({ data: null, error: { message: "API error" } })
    const res = await callSubscribe({ email: "user@example.com" })
    expect(res.status).toBe(500)
  })

  it("still returns 200 even when DB save fails (email is critical, DB is not)", async () => {
    mockLeadCreate.mockRejectedValue(new Error("DB error"))
    const res = await callSubscribe({ email: "user@example.com" })
    expect(res.status).toBe(200)
    expect(mockResendSend).toHaveBeenCalled()
  })

  it("email subject contains PDF name", async () => {
    await callSubscribe({ email: "user@example.com" })
    const call = mockResendSend.mock.calls[0][0]
    expect(call.subject).toContain("GEO в России 2026")
  })

  it("email body includes download link when RESEARCH_PDF_URL is set", async () => {
    process.env.RESEARCH_PDF_URL = "https://blob.vercel-storage.com/research-2026.pdf"
    await callSubscribe({ email: "user@example.com" })
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("research-2026.pdf")
  })

  it("email body shows 'coming soon' message when PDF URL not set", async () => {
    process.env.RESEARCH_PDF_URL = ""
    await callSubscribe({ email: "user@example.com" })
    const call = mockResendSend.mock.calls[0][0]
    expect(call.html).toContain("ближайшее время")
  })
})
