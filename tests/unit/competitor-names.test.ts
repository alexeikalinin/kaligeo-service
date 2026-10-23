import { describe, expect, it } from "vitest"
import { namedCompetitors } from "@/lib/analysis/competitor-names"
describe("Competitor labels", () => {
  it("does not rank generic market categories as competitors", () => {
    expect(namedCompetitors(["интернет-магазины электроники и игр в Минске", "специализированные магазины видеоигр", "ритейлеры видеоигр и консолей", "21vek.by", "5 элемент"])).toEqual(["21vek.by", "5 элемент"])
  })
})
