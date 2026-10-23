import { describe, expect, it, vi } from "vitest"
vi.mock("@/lib/ai-clients", () => ({ AI_CLIENTS: {}, getActivePlatforms: () => [] }))
import { buildQuickQueries } from "@/lib/freemium/quick-check"

describe("quick check questions", () => {
  it("uses the business category and location without treating a shop as a contractor", () => {
    const questions = buildQuickQueries("GamePark", "Интернет-магазин игровых приставок в Минске. Продаёт консоли и аксессуары.", ["приставка"], "https://gamepark.by/")
    expect(questions).toHaveLength(3)
    expect(questions[0]).toContain("GamePark")
    expect(questions[1]).toContain("Интернет-магазин игровых приставок в Минске")
    expect(questions[2]).toContain("«приставка»")
    expect(questions.join(" ")).not.toMatch(/для приставка|исполнителя|Продаёт консоли/)
  })
})
