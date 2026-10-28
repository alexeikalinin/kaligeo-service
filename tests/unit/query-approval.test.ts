import { describe, it, expect, vi } from "vitest"
const { generate, judge } = vi.hoisted(() => ({ generate: vi.fn(), judge: vi.fn() }))
vi.mock("openai", () => ({ default: class { chat = { completions: { create: generate } } } }))
vi.mock("ai", async (importOriginal) => ({ ...await importOriginal<typeof import("ai")>(), generateText: judge }))
vi.mock("@/lib/gates", () => ({ getQueryCountForTier: () => 5 }))
import { generateQueries } from "@/trigger/steps/generate-queries"
describe("Question approval recovery", () => {
  it("fills a short approved set with newly reviewed candidates, never unchecked questions", async () => {
    judge.mockResolvedValueOnce({text:JSON.stringify({queries:["Выбор шутеров","Рейтинг головоломок","Обзоры стратегий"]})})
      .mockResolvedValueOnce({text:'{"selected":[1,2]}'})
      .mockResolvedValueOnce({text:JSON.stringify({queries:["Цены подписок","Проблемы аккаунта","Отзывы игроков"]})})
      .mockResolvedValueOnce({text:'{"selected":[1,3,4]}'})
    const questions = await generateQueries("Brand", "Игры", [], "BASIC", [], undefined, undefined, ["GEMINI"])
    expect(questions).toHaveLength(5)
    expect(questions).not.toContain("Рейтинг головоломок")
    expect(questions.slice(0, 3)).toEqual(["Выбор шутеров", "Обзоры стратегий", "Цены подписок"])
    expect(judge).toHaveBeenCalledTimes(4)
  })
})
