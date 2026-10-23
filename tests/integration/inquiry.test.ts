vi.mock("@/lib/prisma", () => ({ prisma: { serviceInquiry: { create: vi.fn().mockResolvedValue({ id: "inquiry-1" }) } } }))
import { beforeEach, describe, expect, it, vi } from "vitest"
const { send, rateLimit } = vi.hoisted(() => ({ send: vi.fn(), rateLimit: vi.fn() }))
vi.mock("resend", () => ({ Resend: class { emails = { send } } }))
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: rateLimit }))
import { prisma } from "@/lib/prisma"
import { POST } from "@/app/api/inquiry/route"
const valid = { email: "reply@example.com", message: "У нас нет сайта, только страница компании в соцсети.", consent: true }
const request = (body: object) => new Request("http://localhost/api/inquiry", { method: "POST", headers: { "Content-Type": "application/json", origin: "https://kaligeo.by" }, body: JSON.stringify(body) })
describe("separate contact inquiry", () => {
  beforeEach(() => { vi.clearAllMocks(); send.mockResolvedValue({ error: null }); rateLimit.mockResolvedValue(true) })
  it("delivers a plain-text inquiry with a reply address and BY sender, without requiring a website", async () => {
    const response = await POST(request(valid) as never)
    expect(response.status).toBe(200)
    expect(prisma.serviceInquiry.create).toHaveBeenCalledWith({ data: { kind: "inquiry", payload: expect.objectContaining({ email: valid.email, message: valid.message, consent: true }) } })
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://kaligeo.by")
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ from: expect.stringContaining("kaligeo.by"), replyTo: valid.email, text: expect.stringContaining(valid.message) }))
    expect(send.mock.calls[0][0]).not.toHaveProperty("html")
  })
  it.each([{ ...valid, consent: false }, { ...valid, email: "invalid" }, { ...valid, message: " " }])("rejects invalid or unconsented inquiries", async body => {
    expect((await POST(request(body) as never)).status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })
  it("reports delivery failure instead of showing success", async () => {
    send.mockResolvedValue({ error: { message: "unavailable" } })
    expect((await POST(request(valid) as never)).status).toBe(502)
  })
  it("limits repeated submissions", async () => {
    rateLimit.mockResolvedValue(false)
    expect((await POST(request(valid) as never)).status).toBe(429)
    expect(send).not.toHaveBeenCalled()
  })
})
