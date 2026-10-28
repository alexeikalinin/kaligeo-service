import { describe, it, expect, vi, beforeEach } from "vitest"
const { tx } = vi.hoisted(() => ({ tx: { auditJob: { findUniqueOrThrow: vi.fn(), update: vi.fn() }, queryResult: { deleteMany: vi.fn(), createMany: vi.fn() }, report: { upsert: vi.fn() } } }))
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) } }))
import { reuseBaseline } from "@/lib/analysis/reuse-baseline"
const owner = { clientId: "client", clientEmail: "owner@example.com", market: "by", websiteUrl: "https://example.com" }
const source = { ...owner, id: "source", tier: "BASIC", status: "COMPLETED", generatedQueries: ["q"], selectedPlatforms: ["CHATGPT"], queryResults: [{ id: "r", jobId: "source", platform: "CHATGPT", query: "q", response: "ok", sourceCategories: null }], report: { id: "r", jobId: "source", createdAt: new Date(), overallScore: 12 }, completedAt: new Date(), competitors: [], analysisSnapshot: { scoreVersion:"entity-frequency-v1",internalAiUsage: [{ estimatedUsd: 0.1 }] }, pdfUrl: null }
beforeEach(() => vi.resetAllMocks())
describe("Reuse a baseline without AI generation", () => {
  it("copies the saved report and original measurement date", async () => {
    tx.auditJob.findUniqueOrThrow.mockResolvedValueOnce(source).mockResolvedValueOnce({ ...owner, tier: "MONITOR_START" })
    expect(await reuseBaseline("target", "source")).toMatchObject({ aiCalls: 0 })
    expect(tx.report.upsert.mock.calls[0][0].update.overallScore).toBe(12)
    expect(tx.auditJob.update.mock.calls[0][0].data.completedAt).toBe(source.completedAt)
    expect(tx.auditJob.update.mock.calls[0][0].data.analysisSnapshot.baselineSourceJobId).toBe("source")
    expect(tx.auditJob.update.mock.calls[0][0].data.analysisSnapshot.internalAiUsage).toEqual([])
  })
  it("rejects a different owner before deleting anything", async () => {
    tx.auditJob.findUniqueOrThrow.mockResolvedValueOnce(source).mockResolvedValueOnce({ ...owner, clientId: "other", tier: "MONITOR_START" })
    await expect(reuseBaseline("target", "source")).rejects.toThrow("ownership")
    expect(tx.queryResult.deleteMany).not.toHaveBeenCalled()
  })
  it("rejects an incomplete baseline even if its status says completed", async () => {
    tx.auditJob.findUniqueOrThrow.mockResolvedValueOnce({ ...source, queryResults: [] }).mockResolvedValueOnce({ ...owner, tier: "MONITOR_START" })
    await expect(reuseBaseline("target", "source")).rejects.toThrow("incomplete")
    expect(tx.report.upsert).not.toHaveBeenCalled()
  })
})
