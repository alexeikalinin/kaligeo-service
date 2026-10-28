import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: { queryResult: { groupBy: vi.fn() }, auditJob: { count: vi.fn() } } }))
import { prisma } from "@/lib/prisma"
import { assertCanStartAudit, runRiskAgent } from "@/lib/agents/risk-agent"

describe("audit capacity without internal daily quotas", () => {
  beforeEach(() => vi.clearAllMocks())
  it("keeps every requested platform even beyond former daily thresholds", async () => {
    const platforms = ["CHATGPT", "PERPLEXITY", "GROK"]
    vi.mocked(prisma.queryResult.groupBy).mockResolvedValue(platforms.map(platform => ({ platform, _count: { id: 10000 } })) as never)
    vi.mocked(prisma.auditJob.count).mockResolvedValue(0)
    const report = await runRiskAgent(platforms)
    expect(report.canStartAudit).toBe(true)
    expect(report.blockedPlatforms).toEqual([])
    expect(report.platformStatuses.every(p => p.dailyLimit === null && p.usagePct === null && p.usedToday === 10000)).toBe(true)
    expect(await assertCanStartAudit(platforms)).toEqual({ platformsToUse: platforms, skippedPlatforms: [], warnings: [] })
  })
  it("reports queue pressure without blocking execution", async () => {
    vi.mocked(prisma.queryResult.groupBy).mockResolvedValue([])
    vi.mocked(prisma.auditJob.count).mockResolvedValue(12)
    const report = await runRiskAgent(["YANDEXGPT"])
    expect(report.riskLevel).toBe("critical")
    expect(report.canStartAudit).toBe(true)
    expect((await assertCanStartAudit(["YANDEXGPT"])).platformsToUse).toEqual(["YANDEXGPT"])
  })
  it("rejects an audit without platforms", async () => {
    await expect(assertCanStartAudit([])).rejects.toThrow("Нет доступных платформ")
  })
})
