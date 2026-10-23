import { describe, it, expect, vi, beforeEach } from "vitest"
const { query, create } = vi.hoisted(() => ({ query: vi.fn(), create: vi.fn() }))
vi.mock("@/lib/ai-clients", () => ({ AI_CLIENTS: { YANDEXGPT: { query } } }))
vi.mock("@/lib/prisma", () => ({ prisma: { queryResult: { create } } }))
import { executeQueriesOnPlatform } from "@/trigger/steps/execute-queries"
describe("Unavailable platform evidence", () => {
  beforeEach(() => { vi.clearAllMocks() })
  it("retains failed questions, stops repeated failures and never saves them as zero-visibility answers", async () => {
    query.mockRejectedValue(new TypeError("fetch failed"))
    const outcome = await executeQueriesOnPlatform("qa-1", ["q1", "q2", "q3", "q4", "q5"], "YANDEXGPT", "Brand", "https://brand.example", [])
    expect(query).toHaveBeenCalledTimes(3)
    expect(create).not.toHaveBeenCalled()
    expect(outcome.results).toEqual([])
    expect(outcome.failures.map(f => f.query)).toEqual(["q1", "q2", "q3", "q4", "q5"])
  })
  it("treats an empty provider response as failure", async () => {
    query.mockResolvedValue(" ")
    const outcome = await executeQueriesOnPlatform("qa-1", ["q1"], "YANDEXGPT", "Brand", "https://brand.example", [])
    expect(outcome.results).toHaveLength(0)
    expect(outcome.failures).toHaveLength(1)
    expect(create).not.toHaveBeenCalled()
  })
})
