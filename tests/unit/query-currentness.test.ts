import { expect, it } from "vitest"
import { filterCandidates } from "@/trigger/steps/generate-queries"
it("does not send historical rankings to a current visibility audit", () => {
  const year = new Date().getUTCFullYear()
  expect(filterCandidates([`Топ игр за ${year - 1} год`, "Лучшие онлайн-шутеры сейчас"], "Brand")).toEqual(["Лучшие онлайн-шутеры сейчас"])
})
