import { describe, it, expect } from "vitest"
import { auditFailure } from "@/lib/analysis/audit-failure"
describe("safe audit failure", () => {
 it("explains an incomplete map without exposing provider payloads", () => {
  const failure = auditFailure("No output generated. secret-key-123")
  expect(failure.stage).toBe("Карта бизнеса")
  expect(failure.reason).toContain("не отправляются")
  expect(JSON.stringify(failure)).not.toContain("secret-key")
 })
 it("retains the failed stage after the job becomes FAILED", () => {
  const original = auditFailure("arbitrary provider failure", "ANALYZING")
  expect(auditFailure(`${original.stage}: ${original.reason}`, "FAILED").stage).toBe("Анализ ответов")
 })
 it("identifies payment failure without returning raw response", () => {
  expect(auditFailure("HTTP 402 key=secret").stage).toBe("Проверка доступности ИИ")
  expect(JSON.stringify(auditFailure("HTTP 402 key=secret"))).not.toContain("secret")
 })
})
