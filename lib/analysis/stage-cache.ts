import { currentInternalUsage, withInternalUsage } from "./internal-usage"
import { createHash } from "node:crypto"
import { prisma } from "../prisma"

export function analysisFingerprint(input: unknown): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex")
}

export async function cachedAnalysisStage<T>(jobId: string, name: string, fingerprint: string, work: () => Promise<T>): Promise<T> {
  const job = await prisma.auditJob.findUniqueOrThrow({ where: { id: jobId }, select: { analysisSnapshot: true } })
  const snapshot = job.analysisSnapshot as { analysisStages?: Record<string, { fingerprint: string; value: T }> } | null
  const saved = snapshot?.analysisStages?.[name]
  if (saved?.fingerprint === fingerprint) return saved.value
  let value: T
  try { value = await withInternalUsage(jobId, name, work) }
  catch (error) { throw new Error(`Analysis stage ${name} failed: ${error instanceof Error ? error.message.slice(0, 500) : "unknown error"}`, { cause: error }) }
  if (value === undefined || value === null || value === "") throw new Error(`Analysis stage ${name} returned no result`)
  // Atomic JSON merge preserves concurrent stage completions and other metadata.
  const entry = JSON.stringify({ fingerprint, value })
  await prisma.$executeRaw`
    UPDATE "AuditJob"
    SET "analysisSnapshot" = jsonb_set(
      COALESCE("analysisSnapshot", '{}'::jsonb),
      '{analysisStages}',
      COALESCE("analysisSnapshot"->'analysisStages', '{}'::jsonb) || jsonb_build_object(${name}::text, ${entry}::jsonb)
    ), "updatedAt" = NOW()
    WHERE id = ${jobId}
  `
  return value
}

/** Checkpoint individual paid calls inside a multi-call stage. */
export async function cachedInternalStep<T>(name:string,input:unknown,work:()=>Promise<T>):Promise<T>{
 const scope=currentInternalUsage()
 if(!scope)return work()
 return cachedAnalysisStage(scope.jobId,`${scope.stage}/${name}`,analysisFingerprint(input),work)
}
