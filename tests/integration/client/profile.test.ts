import { beforeEach, describe, expect, it, vi } from "vitest"
const { session, update } = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn() }))
vi.mock("@/lib/client-session", () => ({ getClientSession: session }))
vi.mock("@/lib/prisma", () => ({ prisma: { client: { update } } }))
import { PATCH } from "@/app/api/client/profile/route"
const request = (body: object) => new Request("https://app.kaligeo.by/api/client/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
describe("account profile", () => {
  beforeEach(() => { vi.clearAllMocks(); session.mockResolvedValue("owner"); update.mockResolvedValue({}) })
  it("requires login", async () => { session.mockResolvedValue(null); expect((await PATCH(request({}) as never)).status).toBe(401); expect(update).not.toHaveBeenCalled() })
  it("updates only the signed-in account and ignores a submitted client ID", async () => {
    expect((await PATCH(request({ displayName: " Алексей ", companyName: "Компания", clientId: "someone-else" }) as never)).status).toBe(200)
    expect(update).toHaveBeenCalledWith({ where: { id: "owner" }, data: { displayName: "Алексей", companyName: "Компания" } })
  })
  it("rejects invalid company names", async () => { expect((await PATCH(request({ displayName: "Алексей", companyName: " " }) as never)).status).toBe(400); expect(update).not.toHaveBeenCalled() })
})
