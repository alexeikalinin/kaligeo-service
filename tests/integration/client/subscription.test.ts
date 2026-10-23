import { beforeEach, describe, expect, it, vi } from "vitest"
const { session, find, update } = vi.hoisted(() => ({ session: vi.fn(), find: vi.fn(), update: vi.fn() }))
vi.mock("@/lib/client-session", () => ({ getClientSession: session }))
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "app.kaligeo.by" }) }))
vi.mock("@/lib/prisma", () => ({ prisma: { subscription: { findFirst: find, update } } }))
import { POST } from "@/app/api/client/subscription/cancel/route"
describe("subscription cancellation", () => {
  beforeEach(() => { vi.clearAllMocks(); session.mockResolvedValue("owner"); find.mockResolvedValue({ id: "by-sub" }); update.mockResolvedValue({ id: "by-sub", status: "CANCELED", bindingId: "private-bank-reference" }) })
  it("requires login", async () => { session.mockResolvedValue(null); expect((await POST()).status).toBe(401); expect(update).not.toHaveBeenCalled() })
  it("cancels only the current owner and market and does not disclose bank references", async () => {
    const response = await POST()
    expect(find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ clientId: "owner", market: "by" }) }))
    expect(await response.json()).toEqual({ subscription: { id: "by-sub", status: "CANCELED" } })
  })
  it("does not claim success if there is no active subscription", async () => { find.mockResolvedValue(null); expect((await POST()).status).toBe(404); expect(update).not.toHaveBeenCalled() })
})
