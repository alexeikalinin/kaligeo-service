import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "app.kaligeo.by" }) }))
vi.mock("@/lib/prisma", () => ({ prisma: { freemiumScan: { findUnique: vi.fn().mockResolvedValue({
  id: "scan-1", analysisSnapshot: { companyName: "GamePark" }, companyName: "ИП БОНДАРЕНКО", websiteUrl: "https://example.com", niche: "Квесты", services: [],
  market: "by", emailCaptured: "private@example.com", quickCheckDone: true, previewScore: 20,
  platformScores: { CHATGPT: { score: 20 }, YANDEXGPT: { score: 20 } },
  queryEvidence: { queries: ["Где пройти квест?"] },
}) } } }))

import PreviewPage from "@/app/preview/[scanId]/page"
import PricingPage from "@/app/pricing/page"
import OrderPage from "@/app/order/page"

describe("customer journey", () => {
  it("shows every measured platform and the actual questions without a repeated trial offer", async () => {
    const html = renderToStaticMarkup(await PreviewPage({ params: Promise.resolve({ scanId: "scan-1" }) }))
    expect(html).toContain("ChatGPT")
    expect(html).toContain("YandexGPT")
    expect(html).toContain("Где пройти квест?")
    expect(html).toContain('/pricing?scanId=scan-1')
    expect(html).not.toContain("Попробуйте первый аудит бесплатно")
    expect(html).not.toContain("private@example.com")
  })
  it("takes all six pricing choices directly to an order and retains the original scan", async () => {
    const html = renderToStaticMarkup(await PricingPage({ searchParams: Promise.resolve({ scanId: "scan-1" }) }))
    for (const tier of ["BASIC", "STANDARD", "ADVANCED", "MONITOR_START", "MONITOR_PRO", "MONITOR_AGENT"]) {
      expect(html).toContain(`/order?tier=${tier}&amp;scanId=scan-1`)
    }
    expect(html).not.toContain('https://kaligeo.by/#pricing')
  })
  it("prefills the business and niche at checkout without disclosing captured email", async () => {
    const html = renderToStaticMarkup(await OrderPage({ searchParams: Promise.resolve({ scanId: "scan-1", tier: "ADVANCED" }) }))
    expect(html).toContain("899 BYN")
    expect(html).toContain('value="GamePark"')
    expect(html).toContain('value="Квесты"')
    expect(html).toContain('value="https://example.com"')
    expect(html).not.toContain("private@example.com")
  })
})


it("sends locked report features directly to current pricing without obsolete dollar prices", async () => {
  const { LockedTabPlaceholder } = await import("@/components/report/LockedTabPlaceholder")
  const html = renderToStaticMarkup(LockedTabPlaceholder({ requiredTier: "STANDARD", tabKey: "plan" }))
  expect(html).toContain('href="/pricing"')
  expect(html).toContain("Профи")
  expect(html).not.toContain("$150")
  expect(html).not.toContain('href="/#pricing"')
})
