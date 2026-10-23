import { beforeEach, describe, expect, it, vi } from "vitest"
const m = vi.hoisted(() => ({ session: vi.fn(), find: vi.fn(), list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn() }))
vi.mock("@/lib/client-session", () => ({ getClientSession: m.session }))
vi.mock("@/lib/prisma", () => ({ prisma: { brandProfile: { findUnique: m.find, findMany: m.list, create: m.create, update: m.update, delete: m.remove } } }))
import { GET, POST } from "@/app/api/client/brands/route"
import { PATCH, DELETE } from "@/app/api/client/brands/[id]/route"
const request = (body: object) => new Request("https://app.kaligeo.by/api/client/brands", { method: "POST", body: JSON.stringify(body) }) as never
const params = { params: Promise.resolve({ id: "brand-test" }) }
describe("Brand profile management", () => {
  beforeEach(() => { vi.resetAllMocks(); m.session.mockResolvedValue("owner"); m.find.mockResolvedValue({ clientId: "owner" }); m.create.mockResolvedValue({ id: "brand-test" }); m.update.mockResolvedValue({ id: "brand-test" }); m.list.mockResolvedValue([]) })
  it("requires login", async () => { m.session.mockResolvedValue(null); expect((await GET()).status).toBe(401); expect((await POST(request({}))).status).toBe(401) })
  it("lists only the current owner's profiles", async () => { await GET(); expect(m.list).toHaveBeenCalledWith(expect.objectContaining({ where: { clientId: "owner" } })) })
  it("stores aliases, competitors and custom questions under the authenticated owner", async () => {
    const data = { companyName: "GamePark", websiteUrl: "https://example.com", alternativeNames: ["Геймпарк"], competitors: ["OtherBrand"], customPrompts: [{ id: "q1", text: "Где купить консоль в Минске?", enabled: true }], clientId: "attacker" }
    expect((await POST(request(data))).status).toBe(201)
    expect(m.create).toHaveBeenCalledWith({ data: expect.objectContaining({ clientId: "owner", alternativeNames: data.alternativeNames, competitors: data.competitors, customPrompts: data.customPrompts }) })
  })
  it("rejects invalid website URLs", async () => { expect((await POST(request({ companyName: "A", websiteUrl: "bad" }))).status).toBe(400); expect(m.create).not.toHaveBeenCalled() })
  it("does not change other profile fields on a partial update", async () => { expect((await PATCH(request({ niche: "Игры" }), params)).status).toBe(200); expect(m.update).toHaveBeenCalledWith({ where: { id: "brand-test" }, data: { niche: "Игры" } }) })
  it("rejects malformed list fields instead of crashing", async () => { expect((await PATCH(request({ competitors: "not an array" }), params)).status).toBe(400); expect(m.update).not.toHaveBeenCalled() })
  it("prevents editing or deleting another client's profile", async () => { m.find.mockResolvedValue({ clientId: "other" }); expect((await PATCH(request({ niche: "x" }), params)).status).toBe(404); expect((await DELETE(request({}), params)).status).toBe(404); expect(m.update).not.toHaveBeenCalled(); expect(m.remove).not.toHaveBeenCalled() })
})
