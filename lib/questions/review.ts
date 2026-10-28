import { createHash } from "node:crypto"
export type QuestionReview = { hash: string; state: "pending" | "approved"; notes: string; approvedAt?: string }
export function questionHash(queries: string[]) { return createHash("sha256").update(JSON.stringify(queries)).digest("hex") }
export function isQuestionSetApproved(queries: string[], review?: QuestionReview) { return review?.state === "approved" && review.hash === questionHash(queries) }
export function validateQuestionSet(value: unknown, count: number): string[] {
  if (!Array.isArray(value) || value.length !== count || value.some(q => typeof q !== "string" || !q.trim() || q.length > 1000)) throw Error("Количество вопросов должно соответствовать тарифу; пустые вопросы запрещены")
  const queries = value.map(q => q.trim())
  if (new Set(queries).size !== count) throw Error("Удалите повторяющиеся вопросы")
  return queries
}
