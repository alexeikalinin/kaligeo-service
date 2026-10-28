import { describe, it, expect, vi, beforeEach } from "vitest"
const { read, write } = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { auditJob: { findUniqueOrThrow: read }, $executeRaw: write } }))
import { cachedAnalysisStage, analysisFingerprint } from "@/lib/analysis/stage-cache"
beforeEach(() => vi.clearAllMocks())
describe("Persisted analysis stages", () => {
  it("does not pay for a successful stage again on retry", async () => {
    read.mockResolvedValue({ analysisSnapshot: { analysisStages: { content: { fingerprint: "same", value: { topics: ["saved"] } } } } })
    const work = vi.fn()
    expect(await cachedAnalysisStage("job", "content", "same", work)).toEqual({ topics: ["saved"] })
    expect(work).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
  it("invalidates stale stages when the evidence changes", async () => {
    read.mockResolvedValue({ analysisSnapshot: { analysisStages: { content: { fingerprint: "old", value: {} } } } })
    const work = vi.fn().mockResolvedValue({ topics: ["new"] })
    expect(await cachedAnalysisStage("job", "content", "new", work)).toEqual({ topics: ["new"] })
    expect(write).toHaveBeenCalledOnce()
    expect(analysisFingerprint({ response: "a" })).not.toBe(analysisFingerprint({ response: "b" }))
  })
  it("reports the failing stage and does not cache a failed call", async () => {
    read.mockResolvedValue({ analysisSnapshot: null })
    await expect(cachedAnalysisStage("job", "gaps", "same", async () => { throw Error("provider timeout") })).rejects.toThrow("Analysis stage gaps failed: provider timeout")
    expect(write).not.toHaveBeenCalled()
  })
})
