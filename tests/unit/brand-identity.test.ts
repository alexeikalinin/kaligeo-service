import { describe, expect, it } from "vitest"
import { resolveAuditBrand } from "@/lib/brand-identity"
describe("Legal entity and public brand", () => {
  it.each(["ИП БОНДАРЕНКО", "ООО «Бондаренко»", "ЧУП Магазин"])('audits the detected brand for %s', submitted => {
    expect(resolveAuditBrand(submitted, "GamePark")).toBe("GamePark")
  })
  it("preserves an explicit public brand", () => expect(resolveAuditBrand("GamePark", "Other footer name")).toBe("GamePark"))
  it("does not invent a name when the site could not be read", () => expect(resolveAuditBrand("ИП БОНДАРЕНКО", "")).toBe("ИП БОНДАРЕНКО"))
})
