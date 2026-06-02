/**
 * Tests for POST /api/contact
 * Accepts JSON and FormData, sends email via Resend + Telegram notify.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockResendSend = vi.fn().mockResolvedValue({ data: {}, error: null })
vi.mock("resend", () => {
  class MockResend {
    emails = { send: (...a: unknown[]) => mockResendSend(...a) }
  }
  return { Resend: MockResend }
})

const mockTgSend = vi.fn().mockResolvedValue(undefined)
vi.mock("@/lib/telegram", () => ({
  tg: { send: (...a: unknown[]) => mockTgSend(...a) },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callContactJSON(body: object, origin = "https://kaligeo.ru") {
  vi.resetModules()
  const { POST } = await import("@/app/api/contact/route")
  const req = new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify(body),
  })
  return POST(req as never)
}

async function callContactFormData(fields: Record<string, string>, origin = "https://kaligeo.ru") {
  vi.resetModules()
  const { POST } = await import("@/app/api/contact/route")
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  const req = new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { origin },
    body: fd,
  })
  return POST(req as never)
}

const validBody = {
  name: "Alexei",
  email: "alexei@example.com",
  website: "https://example.com",
  plan: "STANDARD",
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/contact", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResendSend.mockResolvedValue({ data: {}, error: null })
    mockTgSend.mockResolvedValue(undefined)
    process.env.ADMIN_TELEGRAM_CHAT_ID = "12345"
  })

  it("returns 200 and sends 2 emails (admin + confirmation) for valid JSON", async () => {
    const res = await callContactJSON(validBody)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(mockResendSend).toHaveBeenCalledTimes(2)
  })

  it("sends Telegram notification when chat ID is configured", async () => {
    await callContactJSON(validBody)
    expect(mockTgSend).toHaveBeenCalledWith("12345", expect.stringContaining("Новая заявка"))
  })

  it("does not send Telegram when ADMIN_TELEGRAM_CHAT_ID is empty", async () => {
    process.env.ADMIN_TELEGRAM_CHAT_ID = ""
    await callContactJSON(validBody)
    expect(mockTgSend).not.toHaveBeenCalled()
  })

  it("detects kaligeo.by domain from origin header", async () => {
    await callContactJSON(validBody, "https://kaligeo.by")
    const [adminCall] = mockResendSend.mock.calls
    const emailHtml = adminCall[0].html as string
    expect(emailHtml).toContain("kaligeo.by")
  })

  it("accepts FormData submission", async () => {
    const res = await callContactFormData({
      name: "Test",
      email: "test@example.com",
      website: "https://example.com",
      plan: "BASIC",
    })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it("returns 400 for invalid email", async () => {
    const res = await callContactJSON({ ...validBody, email: "not-an-email" })
    expect(res.status).toBe(400)
    expect(mockResendSend).not.toHaveBeenCalled()
  })

  it("returns 400 when both name and website are missing", async () => {
    const res = await callContactJSON({ email: "test@example.com" })
    expect(res.status).toBe(400)
  })

  it("accepts submission with website but no name", async () => {
    const res = await callContactJSON({ email: "test@example.com", website: "https://example.com" })
    expect(res.status).toBe(200)
  })

  it("returns 500 when Resend fails", async () => {
    mockResendSend.mockRejectedValueOnce(new Error("Network error"))
    const res = await callContactJSON(validBody)
    expect(res.status).toBe(500)
  })

  it("admin email subject includes plan and name", async () => {
    await callContactJSON({ ...validBody, plan: "ADVANCED", name: "BrandCo" })
    const [adminCall] = mockResendSend.mock.calls
    expect(adminCall[0].subject).toContain("ADVANCED")
    expect(adminCall[0].subject).toContain("BrandCo")
  })

  it("sends confirmation email to the client's email address", async () => {
    await callContactJSON(validBody)
    const clientCall = mockResendSend.mock.calls[1]
    expect(clientCall[0].to).toBe("alexei@example.com")
  })
})
