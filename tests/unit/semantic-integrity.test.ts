import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn() }))
vi.mock("ai", async (importOriginal) => ({ ...await importOriginal<typeof import("ai")>(), generateText: mocks.create }))
vi.mock("@/lib/prisma", () => ({ prisma: {
  queryResult: { findMany: async () => [{ id: "answer-1", query: "which game", response: "Brand is an option" }], update: mocks.update },
  auditJob: { findUnique: async () => ({ companyName: "Brand" }) },
} }))
import { runSemanticAnalysisAgent } from "@/lib/agents/semantic-analysis-agent"
beforeEach(() => { vi.clearAllMocks(); mocks.update.mockResolvedValue({}) })
describe("Semantic evidence integrity", () => {
  it("does not manufacture a neutral score when the provider fails", async () => {
    mocks.create.mockRejectedValue(Error("provider unavailable"))
    await expect(runSemanticAnalysisAgent("job")).rejects.toThrow("Semantic classification failed")
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it.each([
    [],
    [{ id: "foreign", context: "REFERENCE", quality: 25 }],
    [{ id: "answer-1", context: "invented", quality: 25 }],
    [{ id: "answer-1", context: "REFERENCE", quality: "25" }],
  ])("rejects missing or invalid evidence (%j)", async (...items) => {
    mocks.create.mockResolvedValue({ text: JSON.stringify(items.filter(Boolean)) })
    await expect(runSemanticAnalysisAgent("job")).rejects.toThrow("Semantic classification failed")
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("persists a complete validated classification", async () => {
    mocks.create.mockResolvedValue({ text: JSON.stringify([{ id: "answer-1", context: "ALTERNATIVE", quality: 35 }]) })
    expect(await runSemanticAnalysisAgent("job")).toMatchObject({ total: 1, classified: 1, avgQuality: 35 })
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: "answer-1" }, data: { mentionContext: "ALTERNATIVE", mentionQuality: 35 } })
  })
  it("does not report success when persistence fails", async () => {
    mocks.create.mockResolvedValue({ text: JSON.stringify([{ id: "answer-1", context: "ALTERNATIVE", quality: 35 }]) })
    mocks.update.mockRejectedValue(Error("database unavailable"))
    await expect(runSemanticAnalysisAgent("job")).rejects.toThrow("database unavailable")
  })
})
