import { verifiedExternalServices, requestsUnverifiedExternalService } from "@/lib/analysis/business-evidence"
import { describe, it, expect, vi } from "vitest"
import { answerId, checkCoverage, uniqueAnswers } from "@/lib/analysis/audit-integrity"
import { hasStructuredData, findWikipedia } from "@/lib/analysis/site-evidence"
import { validateCompetitorEvidence } from "@/lib/agents/competitor-discovery-agent"
import { detectWeakPoints } from "@/lib/analysis/weak-points-checker"
import { brandQuestions } from "@/lib/analysis/query-methodology"
import { calculateVisibilityScores } from "@/lib/analysis/calculate-scores"
import type { QueryResult } from "@prisma/client"
const row = (query: string, mentioned = false): QueryResult => ({ id: query, jobId: "a", platform: "CHATGPT", query, response: "Brand и Other — издатели игр", brandMentioned: mentioned, competitors: [], sources: [], sentiment: "neutral", positionScore: 0, sourceCategories: null, mentionContext: null, mentionQuality: null, createdAt: new Date() })

describe("Evidence and measurement integrity", () => {
  it("does not treat making own products as offering outsourced services", () => {
    const text = "Мы разрабатываем и издаём собственные игры для ПК."
    expect(verifiedExternalServices([{ service: "Разработка на заказ", quote: text }], text)).toEqual([])
    expect(requestsUnverifiedExternalService("Сколько стоит разработка мобильной игры под ключ?", false)).toBe(true)
    expect(requestsUnverifiedExternalService("Посоветуй онлайн-шутер для ПК", false)).toBe(false)
  })
  it("requires an actual quote offering services to clients", () => {
    const quote = "Предлагаем партнёрам услуги издания игр на рынке СНГ."
    expect(verifiedExternalServices([{ service: "Издание игр", quote }], quote)).toHaveLength(1)
    expect(verifiedExternalServices([{ service: "Издание игр", quote }], "Мы разработчик игр")).toEqual([])
  })
  it("does not let duplicate answers cover a missing question", () => {
    expect(checkCoverage(["q1", "q2"], ["CHATGPT"], [row("q1"), row("q1")])[0].missing).toEqual(["q2"])
  })
  it("tracks a missing platform even when another succeeds", () => {
    expect(checkCoverage(["q1"], ["CHATGPT", "GEMINI"], [row("q1")])[1].missing).toEqual(["q1"])
  })
  it("does not count empty responses as success", () => {
    expect(checkCoverage(["q1"], ["CHATGPT"], [{ ...row("q1"), response: " " }])[0].missing).toEqual(["q1"])
  })
  it("stable answer keys prevent retry duplicates and distinguish audits", () => {
    expect(answerId("a", "CHATGPT", "q")).toBe(answerId("a", "CHATGPT", "q"))
    expect(answerId("a", "CHATGPT", "q")).not.toBe(answerId("b", "CHATGPT", "q"))
    expect(uniqueAnswers([row("q"), { ...row("q"), id: "new" }])).toHaveLength(1)
  })
  it("recognizes inline structured data, not ordinary mentions of Schema.org", () => {
    expect(hasStructuredData('<script type="application/ld+json">{"@context":"https://schema.org","@type":"Organization"}</script>')).toBe(true)
    expect(hasStructuredData('<p>Read about schema.org</p>')).toBe(false)
  })
  it("a failed Wikipedia lookup never asserts absence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
    try { expect((await findWikipedia("Brand")).status).toBe("unverified") } finally { vi.unstubAllGlobals() }
  })
  it("does not invent technical or entity diagnoses from a zero score", () => {
    const points = detectWeakPoints([row("q")], "https://brand.example", 0, [], calculateVisibilityScores([row("q")]))
    expect(points.some(p => /missing-schema|wikipedia|few-reviews|reddit/.test(p.id))).toBe(false)
    expect(points.map(p => p.description).join(" ")).not.toContain("Платформа не знает")
  })
  it("limits an absent-markup finding to checked pages", () => {
    const points = detectWeakPoints([row("q")], "https://brand.example", 0, [], {}, { checkedAt: "2026-10-26", pages: [{ url: "https://brand.example/about", schemaFound: false }], wikipedia: { status: "unverified", urls: [] } })
    expect(points.find(p => p.id === "missing-schema")?.description).toContain("https://brand.example/about")
  })
  it("rejects invented competitors or fabricated evidence", () => {
    expect(validateCompetitorEvidence([{ name: "Other", queryResultId: "q", quote: "Other — издатели игр" }, { name: "Invented", queryResultId: "q", quote: "Invented leads" }], [row("q")], "Brand")).toEqual([{ name: "Other", queryResultId: "q", quote: "Other — издатели игр" }])
  })
  it("direct brand answers do not inflate spontaneous visibility", () => {
    const results = [row("Каких издателей игр выбрать?"), ...brandQuestions("Brand").map(q => row(q, true))]
    const score = calculateVisibilityScores(results).CHATGPT
    expect(score.totalQueries).toBe(1)
    expect(score.mentionCount).toBe(0)
    expect(score.score).toBe(0)
  })
})
