import { beforeEach, describe, expect, it, vi } from "vitest"
const m = vi.hoisted(() => ({ find: vi.fn(), create: vi.fn(), update: vi.fn(), job: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { subscription: { findFirst: m.find, create: m.create, update: m.update }, auditJob: { update: m.job } } }))
import { activateSubscriptionForJob } from "@/lib/billing/subscription"
const params = { jobId: "job-test", clientId: "client-test", tier: "MONITOR_PRO", market: "by", provider: "alfabank" as const }
describe("Paid monitoring activation", () => {
  beforeEach(() => { vi.resetAllMocks(); m.find.mockResolvedValue(null); m.create.mockResolvedValue({ id: "sub-test" }); m.update.mockResolvedValue({ id: "sub-test" }); m.job.mockResolvedValue({}) })
  it("does not reuse subscriptions from another market", async () => {
    await activateSubscriptionForJob({ ...params, bindingId: "test-binding" })
    expect(m.find).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ market: "by", clientId: "client-test", tier: "MONITOR_PRO" }) }))
    expect(m.job).toHaveBeenCalledWith({ where: { id: "job-test" }, data: { subscriptionId: "sub-test", subscriptionTier: "MONITOR_PRO", subscriptionActiveUntil: expect.any(Date) } })
  })
  it("retains active status when an existing binding is available but a later lookup omits it", async () => {
    m.find.mockResolvedValue({ id: "sub-test", bindingId: "existing", nextChargeAt: new Date("2026-11-01") })
    await activateSubscriptionForJob(params)
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE", bindingId: "existing" }) }))
  })
  it("does not claim auto renewal is enabled without a saved method", async () => {
    await activateSubscriptionForJob(params)
    expect(m.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "PENDING_FIRST_PAYMENT", nextChargeAt: null }) }))
  })
  it("does not activate a subscription for a one-off tariff", async () => {
    await activateSubscriptionForJob({ ...params, tier: "STANDARD" })
    expect(m.find).not.toHaveBeenCalled(); expect(m.job).not.toHaveBeenCalled()
  })
})
