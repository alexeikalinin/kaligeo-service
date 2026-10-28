import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/prisma", () => ({ prisma: { $executeRaw: vi.fn() } }))
import { getAdvancedAnalysisModel, getLightweightModel, getOrchestratorModel, getActionPlanModel, QUERY_JUDGE_MODEL } from "@/lib/models"
import { internalCost, internalUsageMiddleware, withInternalUsage } from "@/lib/analysis/internal-usage"
import { prisma } from "@/lib/prisma"
describe("Internal Gemini routing and cost", () => {
  it("uses Flash for analysis and Lite for classification independently of Anthropic", () => {
    expect(getAdvancedAnalysisModel()).toMatchObject({ modelId: "gemini-2.5-flash" })
    expect(getOrchestratorModel()).toMatchObject({ modelId: "gemini-2.5-flash" })
    expect(getActionPlanModel("ADVANCED")).toMatchObject({ modelId: "gemini-2.5-flash" })
    expect(getLightweightModel()).toMatchObject({ modelId: "gemini-3.1-flash-lite" })
    expect(QUERY_JUDGE_MODEL).toBe("gemini-2.5-flash")
    expect(getActionPlanModel("BASIC")).toBeNull()
  })
  it("accounts for cache reads and preserves unknown usage", () => {
    expect(internalCost("gemini-2.5-flash", 100000, 20000)).toBeCloseTo(0.08)
    expect(internalCost("gemini-3.1-flash-lite", 100000, 20000)).toBeCloseTo(0.055)
    expect(internalCost("gemini-2.5-flash", 100000, 20000, 100000)).toBeCloseTo(0.053)
    expect(internalCost("gemini-2.5-flash", undefined, 20)).toBeNull()
  })
  it("persists usage under the audit stage without retrying paid work if logging fails", async () => {
    vi.mocked(prisma.$executeRaw).mockResolvedValueOnce(1).mockRejectedValueOnce(Error("logging unavailable"))
    const result = { usage: { inputTokens: { total: 1000 }, outputTokens: { total: 400, reasoning: 100 } } }
    const work = vi.fn().mockResolvedValue(result)
    const run = internalUsageMiddleware.wrapGenerate!
    // Minimal provider response; this exercises accounting, not the provider SDK.
    const call = { doGenerate: work, model: { modelId: "gemini-2.5-flash" } } as Parameters<typeof run>[0]
    expect(await withInternalUsage("job", "content", () => run(call))).toBe(result)
    expect(work).toHaveBeenCalledOnce()
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(3)
  })
})
