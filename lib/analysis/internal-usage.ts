import { meteredAiCall, captureAiUsage } from "./ai-meter"
import { AsyncLocalStorage } from "node:async_hooks"
import { randomUUID } from "node:crypto"
import { prisma } from "../prisma"
import type { LanguageModelMiddleware } from "ai"

const context = new AsyncLocalStorage<{ jobId: string; stage: string }>()
export function currentInternalUsage() { return context.getStore() }
export function withInternalUsage<T>(jobId: string, stage: string, work: () => Promise<T>): Promise<T> {
  return context.run({ jobId, stage }, work)
}

/** Standard text rates, USD per 1M tokens, checked 2026-10-27. */
export function internalCost(model: string, input: number | undefined, output: number | undefined, cached = 0): number | null {
  if (input === undefined || output === undefined) return null
  const prices = model === "gemini-3.1-flash-lite" ? [0.25, 1.5, 0.025]
    : model === "gemini-3.5-flash-lite" ? [0.3, 2.5, 0.03]
    : model === "gemini-2.5-flash-lite" ? [0.1, 0.4, 0.01]
    : model === "gemini-2.5-flash" ? [0.3, 2.5, 0.03]
    : model === "gpt-4o" ? [2.5,10,1.25]
    : model === "gpt-4o-mini" ? [0.15,0.6,0.075] : null
  if (!prices) return null
  return (Math.max(0, input - cached) * prices[0] + output * prices[1] + cached * prices[2]) / 1_000_000
}

export const internalUsageMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v3",
  wrapGenerate: async ({ doGenerate, model }) => {
    const started = Date.now()
    const result = await meteredAiCall(model.provider,model.modelId,0.10,async()=>{
      const result=await doGenerate()
      captureAiUsage({inputTokens:result.usage.inputTokens.total,outputTokens:result.usage.outputTokens.total,cachedInputTokens:result.usage.inputTokens.cacheRead})
      return result
    })
    const scope = context.getStore()
    const usage = result.usage
    const entry = {
      id: randomUUID(), at: new Date().toISOString(), ...scope, provider: model.provider,
      model: model.modelId, inputTokens: usage.inputTokens.total ?? null,
      outputTokens: usage.outputTokens.total ?? null, reasoningTokens: usage.outputTokens.reasoning ?? null,
      cachedInputTokens: usage.inputTokens.cacheRead ?? 0,
      estimatedUsd: internalCost(model.modelId, usage.inputTokens.total, usage.outputTokens.total, usage.inputTokens.cacheRead),
      priceVersion: "2026-10-27", durationMs: Date.now() - started,
    }
    console.log("[internal-ai-usage]", JSON.stringify(entry))
    if (scope) {
      // Logging must not turn a successful paid generation into a retry.
      try {
        await prisma.$executeRaw`
          UPDATE "AuditJob" SET "analysisSnapshot" = jsonb_set(
            COALESCE("analysisSnapshot", '{}'::jsonb), '{internalAiUsage}',
            COALESCE("analysisSnapshot"->'internalAiUsage', '[]'::jsonb) || ${JSON.stringify([entry])}::jsonb
          ) WHERE id = ${scope.jobId}
        `
      } catch { console.error("[internal-ai-usage] persistence failed; usage remains in task logs", entry.id) }
    }
    return result
  },
}
