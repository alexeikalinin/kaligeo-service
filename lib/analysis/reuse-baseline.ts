import { prisma } from "../prisma"
import { getBaseTier, type Tier } from "../gates"
import { uniqueAnswers, answerId, checkCoverage } from "./audit-integrity"

/** Copy an existing measurement, never start a second AI analysis for a baseline. */
export async function reuseBaseline(targetId: string, sourceId: string) {
  if (targetId === sourceId) throw new Error("Baseline cannot refer to itself")
  return prisma.$transaction(async tx => {
    const source = await tx.auditJob.findUniqueOrThrow({ where: { id: sourceId }, include: { report: true, queryResults: true } })
    const target = await tx.auditJob.findUniqueOrThrow({ where: { id: targetId } })
    if (source.clientEmail !== target.clientEmail || source.clientId !== target.clientId || source.market !== target.market || source.websiteUrl !== target.websiteUrl || !target.tier.startsWith("MONITOR_") || getBaseTier(source.tier as Tier) !== getBaseTier(target.tier as Tier)) throw new Error("Baseline ownership or scope mismatch")
    if((source.analysisSnapshot as {scoreVersion?:string}|null)?.scoreVersion!=="entity-frequency-v1")throw Error("Baseline requires a new approved methodology")
    const queries = source.generatedQueries as string[]
    if (source.status !== "COMPLETED" || !source.report || !Array.isArray(queries) || !queries.length || !source.selectedPlatforms.length) throw new Error("Baseline is not complete")
    if (checkCoverage(queries, source.selectedPlatforms, source.queryResults).some(c => c.missing.length)) throw new Error("Baseline answers incomplete")
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, jobId: _jobId, createdAt: _date, ...report } = source.report
    await tx.queryResult.deleteMany({ where: { jobId: targetId } })
    await tx.queryResult.createMany({ data: uniqueAnswers(source.queryResults).map(row => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _rowId, jobId: _rowJob, ...data } = row
      return { ...data, sourceCategories: data.sourceCategories ?? undefined, id: answerId(targetId, row.platform, row.query), jobId: targetId }
    }) })
    // Prisma JSON fields are read JSON and need input-compatible null handling.
    const reportData = JSON.parse(JSON.stringify(report))
    await tx.report.upsert({ where: { jobId: targetId }, create: { ...reportData, jobId: targetId }, update: reportData })
    await tx.auditJob.update({ where: { id: targetId }, data: {
      status: "COMPLETED", completedAt: source.completedAt, errorMessage: null,
      generatedQueries: queries, selectedPlatforms: source.selectedPlatforms, competitors: source.competitors,
      pdfUrl: source.pdfUrl, executionDiagnostics: source.executionDiagnostics ?? undefined,
      analysisSnapshot: JSON.parse(JSON.stringify({ ...(source.analysisSnapshot as object ?? {}), internalAiUsage: [], baselineSourceJobId: sourceId, measurementKind: "reused-baseline" })),
    } })
    return { jobId: targetId, reusedFrom: sourceId, aiCalls: 0 }
  }, { timeout: 120000 })
}
