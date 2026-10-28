vi.mock("@/lib/analysis/entity-visibility", async original => ({ ...await original<typeof import("@/lib/analysis/entity-visibility")>(),projectEntityAnswers:(rows:unknown[])=>rows }))
vi.mock("@/lib/questions/review-notification", () => ({ notifyReviewReady: async () => undefined }))
/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest"
const state = vi.hoisted(() => ({ job: {} as any, rows: [] as any[], execute: vi.fn(), generate: vi.fn(), report: vi.fn(), approved: vi.fn() }))
vi.mock("@/lib/questions/review", async (original) => ({ ...await original<typeof import("@/lib/questions/review")>(), isQuestionSetApproved: (...args: any[]) => state.approved(...args) }))
vi.mock("@/lib/agents/question-review-agent", () => ({ reviewQuestions: async () => [] }))
vi.mock("@/lib/questions/question-cards", async original => ({ ...await original<typeof import("@/lib/questions/question-cards")>(), assertCardsApproved: () => undefined }))
vi.mock("@trigger.dev/sdk/v3", () => ({ task: (options: any) => options, tasks: { trigger: vi.fn() } }))
vi.mock("@/trigger/post-audit-sequence", () => ({ postAuditSequence: {} }))
vi.mock("@/lib/prisma", () => ({ prisma: {
  $executeRaw:vi.fn().mockResolvedValue(1),
  auditJob: { findUniqueOrThrow: async () => ({ ...state.job }), update: async ({ data }: any) => Object.assign(state.job, data) },
  queryResult: { update:vi.fn(),findMany: async () => state.rows, deleteMany: async ({ where }: any) => { state.rows = where.id ? state.rows.filter(r => !where.id.in.includes(r.id)) : [] } },
  report: { upsert: (...args: any[]) => state.report(...args) },
} }))
vi.mock("@/trigger/steps/execute-queries", () => ({ executeQueriesOnPlatform: (...args: any[]) => state.execute(...args) }))
vi.mock("@/trigger/steps/generate-queries", () => ({ generateQueries: (...args: any[]) => state.generate(...args) }))
vi.mock("@/lib/ai-clients", () => ({ getActivePlatforms: () => ["CHATGPT"] }))
vi.mock("@/lib/agents/risk-agent", () => ({ assertCanStartAudit: async (p: string[]) => ({ platformsToUse: p, skippedPlatforms: [] }) }))
vi.mock("@/lib/agents/website-analysis-agent", () => ({ runWebsiteAnalysisAgent: vi.fn().mockResolvedValue({}) }))
vi.mock("@/lib/agents/analysis-agent", () => ({ runAnalysisAgent: vi.fn(), runCompetitorGapsAgent: vi.fn() }))
vi.mock("@/lib/agents/content-agent", () => ({ runContentAgent: vi.fn() }))
vi.mock("@/lib/agents/growth-plan-agent", () => ({ runGrowthPlanAgent: vi.fn() }))
vi.mock("@/lib/agents/benchmark-agent", () => ({ runBenchmarkAgent: vi.fn() }))
vi.mock("@/lib/agents/semantic-analysis-agent", () => ({ runSemanticAnalysisAgent: vi.fn() }))
vi.mock("@/lib/agents/competitor-discovery-agent", () => ({ discoverCompetitors: vi.fn().mockResolvedValue([]) }))
vi.mock("@/trigger/steps/render-pdf", () => ({ renderAndUploadPdf: vi.fn().mockResolvedValue("https://example.test/a.pdf") }))
vi.mock("@/trigger/steps/deliver", () => ({ sendReportEmail: vi.fn(), sendFollowUpEmail: vi.fn() }))
vi.mock("@/lib/notify", () => ({ notifyAuditCompleted: vi.fn(), notifyAuditFailed: vi.fn() }))
vi.mock("@/lib/report/action-plan-gen", () => ({ generateActionPlan: vi.fn() }))
import { mapHash } from "@/lib/questions/business-map"
import { auditPipeline } from "@/trigger/audit-pipeline"
const run = (auditPipeline as any).run
const testMap = {entities:[],relationships:[],audiences:[],geography:[],scope:[],unknowns:[]}
const queries = Array.from({ length: 15 }, (_, i) => `q${i}`)
const answer = (q: string) => ({ id: q, jobId: "j", query: q, platform: "CHATGPT", response: "No match", brandMentioned: false, sources: [], competitors: [], sentiment: "absent", positionScore: 0, sourceCategories: {} })
beforeEach(() => {
  vi.clearAllMocks()
  state.approved.mockReturnValue(true)
  state.job = { id: "j", source: "qa-acceptance", status: "FAILED", tier: "BASIC", companyName: "Brand", niche: "Games", websiteUrl: "https://brand.example", market: "by", competitors: [], selectedPlatforms: ["CHATGPT"], generatedQueries: queries, analysisSnapshot: { businessMap:testMap,businessMapReview:{state:"approved",hash:mapHash(testMap)},questionSetVersion: "2026-10-entity-v4" } }
  state.rows = []
})
describe("Pipeline completeness and recovery", () => {
  it("stops before paid platform calls without approval", async () => {
    state.approved.mockReturnValue(false)
    const result = await run({jobId:"j",validation:true})
    expect(result.awaitingQuestionApproval).toBe(true)
    expect(state.execute).not.toHaveBeenCalled()
    expect(state.report).not.toHaveBeenCalled()
    expect(state.job.analysisSnapshot.questionReview.state).toBe("pending")
  })
  it("does not pay for other platforms when an expected platform has no configuration",async()=>{
    state.job.selectedPlatforms=["CHATGPT","YANDEXGPT"]
    await expect(run({jobId:"j",validation:true})).rejects.toThrow("не настроены платформы")
    expect(state.execute).not.toHaveBeenCalled()
    expect(state.report).not.toHaveBeenCalled()
  })
  it("never publishes a partial run and retries only unanswered questions", async () => {
    state.rows = queries.slice(0, 14).map(answer)
    state.execute.mockResolvedValueOnce({ results: [], failures: [{ query: "q14", error: "provider down" }] })
    await expect(run({ jobId: "j", validation: true })).rejects.toThrow("Incomplete audit")
    expect(state.job.status).toBe("FAILED")
    expect(state.report).not.toHaveBeenCalled()
    expect(state.execute.mock.calls[0][1]).toEqual(["q14"])
    state.execute.mockImplementationOnce(async (_job: string, missing: string[]) => { state.rows.push(...missing.map(answer)); return { results: missing.map(answer), failures: [] } })
    await run({ jobId: "j", validation: true })
    expect(state.generate).not.toHaveBeenCalled()
    expect(state.execute.mock.calls[1][1]).toEqual(["q14"])
    expect(state.job.status).toBe("COMPLETED")
    expect(state.job.analysisSnapshot.questionSetVersion).toBe("2026-10-entity-v4")
    expect(state.report).toHaveBeenCalledTimes(1)
  })
  it("retains a newly generated question set when regeneration is retried", async () => {
    state.job.analysisSnapshot = {businessMap:testMap,businessMapReview:{state:"approved",hash:mapHash(testMap)}}
    const fresh = queries.map(q => `new-${q}`)
    state.generate.mockResolvedValue(fresh)
    state.execute.mockImplementationOnce(async () => { state.rows.push(...fresh.slice(0, 14).map(answer)); return { results: [], failures: [{ error: "down" }] } })
    await expect(run({ jobId: "j", validation: true, regenerateQuestions: true })).rejects.toThrow("Incomplete audit")
    state.execute.mockImplementationOnce(async (_job: string, missing: string[]) => { state.rows.push(...missing.map(answer)); return { results: missing.map(answer), failures: [] } })
    await run({ jobId: "j", validation: true, regenerateQuestions: true })
    expect(state.generate).toHaveBeenCalledTimes(1)
    expect(state.execute.mock.calls[1][1]).toEqual(["new-q14"])
    expect(state.job.status).toBe("COMPLETED")
  })
})
