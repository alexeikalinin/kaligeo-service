import { describe, it, expect, vi, beforeEach } from "vitest"
const { find, create, trigger } = vi.hoisted(() => ({ find: vi.fn(), create: vi.fn(), trigger: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { lead: { findFirst: find, create } } }))
vi.mock("@trigger.dev/sdk/v3", () => ({ tasks: { trigger } }))
import { POST } from "@/app/api/research-2026/subscribe/route"
async function subscribe(body: object) {
  return POST(new Request("http://localhost/api/research-2026/subscribe", { method: "POST", body: JSON.stringify(body) }) as never)
}
describe("Research signup delivery", () => {
  beforeEach(() => { vi.resetAllMocks(); find.mockResolvedValue(null); create.mockResolvedValue({ id: "lead-1", companyName: "ACME" }); trigger.mockResolvedValue({ id: "run-1" }) })
  it("normalizes email and queues delivery only after retaining the lead", async () => {
    expect((await subscribe({ email: " USER@example.com ", company: "ACME" })).status).toBe(200)
    expect(create).toHaveBeenCalledWith({ data: { email: "user@example.com", companyName: "ACME", source: "research-2026", status: "NEW" } })
    expect(trigger).toHaveBeenCalledWith("send-research-nurture-sequence", { leadId: "lead-1", email: "user@example.com", companyName: "ACME" }, { idempotencyKey: "research-lead-1" })
  })
  it("retries an existing signup with the same delivery key rather than losing the email after a queue outage", async () => {
    find.mockResolvedValue({ id: "lead-1", companyName: "Original" })
    expect((await subscribe({ email: "user@example.com" })).status).toBe(200)
    expect(create).not.toHaveBeenCalled()
    expect(trigger).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ companyName: "Original" }), { idempotencyKey: "research-lead-1" })
  })
  it("reports a queue failure instead of claiming the email was accepted", async () => {
    trigger.mockRejectedValue(new Error("unavailable"))
    expect((await subscribe({ email: "user@example.com" })).status).toBe(503)
  })
  it("does not enqueue when storage fails", async () => {
    create.mockRejectedValue(new Error("database unavailable"))
    expect((await subscribe({ email: "user@example.com" })).status).toBe(503)
    expect(trigger).not.toHaveBeenCalled()
  })
  it.each([{}, { email: "bad" }, { email: "a@b.com", company: "x".repeat(201) }])("rejects invalid signup %j", async body => {
    expect((await subscribe(body)).status).toBe(400)
    expect(create).not.toHaveBeenCalled()
    expect(trigger).not.toHaveBeenCalled()
  })
})
