import {ensurePlatformsReady,PlatformPreflightError} from "../lib/ai-clients/preflight"
import { withInternalUsage } from "../lib/analysis/internal-usage"
import { measureEntities,measurementVersion,projectEntityAnswers } from "../lib/analysis/entity-visibility"
import { reviewFeedback } from "../lib/questions/review-feedback"
import { notifyReviewReady } from "../lib/questions/review-notification"
import { reviewQuestions } from "../lib/agents/question-review-agent"
import { cardsVersion, assertCardsApproved, type QuestionCard } from "../lib/questions/question-cards"
import { buildBusinessMap } from "../lib/agents/business-map-agent"
import { mapHash, type BusinessMap } from "../lib/questions/business-map"
import { isQuestionSetApproved, questionHash, type QuestionReview } from "../lib/questions/review"
import { INTERNAL_MODEL_VERSION, INTERNAL_FLASH_MODEL, INTERNAL_LITE_MODEL } from "../lib/models"
import { Prisma } from "@prisma/client"
import { analysisFingerprint, cachedAnalysisStage } from "../lib/analysis/stage-cache"
import { isBrandQuestion, METHODOLOGY_VERSION } from "../lib/analysis/query-methodology"
import { uniqueAnswers, checkCoverage } from "../lib/analysis/audit-integrity"
import { reuseBaseline } from "../lib/analysis/reuse-baseline"
import { discoverCompetitors } from "../lib/agents/competitor-discovery-agent"
import { extractMentions } from "../lib/analysis/extract-mentions"
import type { SiteEvidence } from "../lib/analysis/site-evidence"
import { namedCompetitors } from "../lib/analysis/competitor-names"
import { resolveAuditBrand } from "../lib/brand-identity"
import { task, tasks, AbortTaskRunError } from "@trigger.dev/sdk/v3"
import { postAuditSequence } from "./post-audit-sequence"
import { prisma } from "../lib/prisma"
import { runWebsiteAnalysisAgent, type WebsiteAnalysisResult } from "../lib/agents/website-analysis-agent"
import { executeQueriesOnPlatform } from "./steps/execute-queries"
import { generateQueries, type SiteContext } from "./steps/generate-queries"
import { renderAndUploadPdf } from "./steps/render-pdf"
import { sendReportEmail, sendFollowUpEmail } from "./steps/deliver"
import { calculateVisibilityScores, calculateOverallScore } from "../lib/analysis/calculate-scores"
import { buildCompetitorMatrix } from "../lib/analysis/competitor-matrix"
import { aggregateSources } from "../lib/analysis/aggregate-sources"
import { generateActionPlan } from "../lib/report/action-plan-gen"
import { runGrowthPlanAgent } from "../lib/agents/growth-plan-agent"
import { runAnalysisAgent, runCompetitorGapsAgent } from "../lib/agents/analysis-agent"
import { runContentAgent } from "../lib/agents/content-agent"
import { runSemanticAnalysisAgent } from "../lib/agents/semantic-analysis-agent"
import { getTierConfig, getBaseTier, type Tier } from "../lib/gates"
import { assertCanStartAudit } from "../lib/agents/risk-agent"
import { getActivePlatforms } from "../lib/ai-clients"
import { notifyAuditCompleted, notifyAuditFailed } from "../lib/notify"
import { getMarketConfig, type Market } from "../lib/market"

export interface AuditPayload {
  jobId: string
  reuseReportFromJobId?: string // Trusted task input: copy a baseline without AI calls.
  excludedPlatforms?: string[] // QA-only explicit provider exclusions.
  regenerateQuestions?: boolean // QA-only new measurement; preserved reports are backed up by the caller.
  resume?: boolean // QA-only recovery: retain completed questions and answers.
  validation?: boolean // Trusted SDK-only QA run; never accepted from public order forms.
}

export const auditPipeline = task({
  id: "audit-pipeline",
  maxDuration: 3600,
  retry: { maxAttempts: 2 },

  run: async (payload: AuditPayload) => {
    const { jobId } = payload

    const job = await prisma.auditJob.findUniqueOrThrow({ where: { id: jobId } })

    if ((payload.regenerateQuestions || payload.excludedPlatforms) && !payload.validation) throw new Error("QA options require validation mode")
    if (payload.resume && !payload.validation) throw new Error("Resume is restricted to validation runs")
    if (payload.validation && job.source !== "qa-acceptance") throw new Error("Validation requires a dedicated QA job")
    try {
      if (payload.reuseReportFromJobId) return await reuseBaseline(jobId, payload.reuseReportFromJobId)
      return await withInternalUsage(jobId,"pipeline",()=>runPipeline(job, payload.validation === true, !(payload.regenerateQuestions && (job.analysisSnapshot as { questionSetVersion?: string } | null)?.questionSetVersion !== METHODOLOGY_VERSION) && (payload.resume === true || (Array.isArray(job.generatedQueries) && job.generatedQueries.length === getTierConfig(job.tier as Tier).queryCount)), payload.validation ? (payload.excludedPlatforms ?? ["GEMINI", "GIGACHAT"]) : []))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      await prisma.auditJob.update({
        where: { id: jobId },
        data: { status: "FAILED", errorMessage },
      })
      if (!payload.validation) notifyAuditFailed({
        companyName: job.companyName,
        tier: job.tier,
        jobId,
        errorMessage,
      }).catch(console.error)
      if(err instanceof PlatformPreflightError)throw new AbortTaskRunError(errorMessage)
      throw err
    }
  },
})

async function runPipeline(job: Awaited<ReturnType<typeof prisma.auditJob.findUniqueOrThrow>>, validation = false, resume = false, excludedPlatforms: string[] = []) {
    const jobId = job.id
    const tier = job.tier as Tier
    const baseTier = getBaseTier(tier)   // MONITOR_* → BASIC/STANDARD/ADVANCED
    const config = getTierConfig(tier)
    const isAdvanced = baseTier === "ADVANCED"

    if (tier.startsWith("MONITOR_") && !job.baselineJobId && !job.generatedQueries) {
      const baseline = await prisma.auditJob.findFirst({
        where: { clientId: job.clientId, clientEmail: job.clientEmail, market: job.market, websiteUrl: job.websiteUrl, tier: baseTier, status: "COMPLETED", analysisSnapshot:{path:["scoreVersion"],equals:"entity-frequency-v1"} },
        orderBy: { completedAt: "desc" },
      })
      if (baseline) return reuseBaseline(jobId, baseline.id)
    }

    // A recurring audit measures the approved baseline, without regenerating its scope.
    if (job.baselineJobId && !job.generatedQueries) {
      const baseline = await prisma.auditJob.findUniqueOrThrow({where:{id:job.baselineJobId}})
      if (baseline.clientEmail !== job.clientEmail || baseline.clientId !== job.clientId || baseline.websiteUrl !== job.websiteUrl || baseline.market !== job.market) throw Error("Baseline scope mismatch")
      const source=(baseline.analysisSnapshot??{}) as Record<string,unknown>
      const map=source.businessMap as BusinessMap
      const queries=baseline.generatedQueries as string[]
      if(source.scoreVersion!=="entity-frequency-v1" || source.methodologyVersion!==METHODOLOGY_VERSION || !map || !Array.isArray(queries) || queries.length!==config.queryCount) throw Error("Мониторинг требует утверждённую исходную точку текущей методики")
      const review=source.businessMapReview as {state:string;hash:string}|undefined
      if(review?.state!=="approved"||review.hash!==mapHash(map)||!isQuestionSetApproved(queries,source.questionReview as QuestionReview))throw Error("Baseline approvals missing")
      assertCardsApproved(source.questionCards as QuestionCard[],queries,map)
      const inherited:Record<string,unknown>={...(job.analysisSnapshot as object??{})}
      for(const key of ["businessMap","businessMapReview","questionCards","questionCardsVersion","questionReview","questionSetVersion"])inherited[key]=source[key]
      inherited.inheritedMeasurementFrom=baseline.id
      await prisma.auditJob.update({where:{id:jobId},data:{generatedQueries:queries,selectedPlatforms:baseline.selectedPlatforms,analysisSnapshot:JSON.parse(JSON.stringify(inherited))}})
      job.generatedQueries=queries;job.selectedPlatforms=baseline.selectedPlatforms;job.analysisSnapshot=JSON.parse(JSON.stringify(inherited));resume=true
    }

    // Real inference, not just key presence, before spending on site/question analysis.
    const requestedPlatforms=(job.selectedPlatforms.length?job.selectedPlatforms:config.platforms).filter(p=>config.platforms.includes(p)&&!excludedPlatforms.includes(p))
    const dependencies=[...new Set([...requestedPlatforms,"CHATGPT","GEMINI"])]
    await withInternalUsage(jobId,"preflight",()=>ensurePlatformsReady(jobId,dependencies))
    job.analysisSnapshot=(await prisma.auditJob.findUniqueOrThrow({where:{id:jobId},select:{analysisSnapshot:true}})).analysisSnapshot

    const submittedCompetitors = job.competitors
    job.competitors = namedCompetitors(job.competitors)

    // ── Step 0: Website analysis — определяем нишу и компанию по URL ─────
    let siteContext: SiteContext | undefined
    let siteEvidence: SiteEvidence | undefined
    if (job.websiteUrl) {
      try {
        const savedSite = job.analysisSnapshot as unknown as WebsiteAnalysisResult | null
        const analysis = savedSite?.evidence?.pages.length && savedSite.description
          ? savedSite : await runWebsiteAnalysisAgent(job.websiteUrl)
        siteEvidence = analysis.evidence
        const previousSnapshot = job.analysisSnapshot && typeof job.analysisSnapshot === "object" && !Array.isArray(job.analysisSnapshot) ? job.analysisSnapshot : {}
        const updates: Record<string, unknown> = { analysisSnapshot: JSON.parse(JSON.stringify({ ...previousSnapshot, ...analysis, submittedCompanyName: previousSnapshot.submittedCompanyName ?? job.companyName, submittedCompetitors: previousSnapshot.submittedCompetitors ?? submittedCompetitors })) }
        // Обновляем нишу если она пустая или дефолтная
        if (analysis.niche && (!job.niche || job.niche === "Общее")) {
          updates.niche = analysis.niche
          job.niche = analysis.niche
        } else if (analysis.niche && job.niche) {
          // Ниша задана вручную и не пустая — не перезаписываем, но если анализ
          // сайта расходится с введённой нишей, флагаем на ручную проверку вместо
          // того чтобы молча строить вопросы по неверной теме.
          const enteredWords = new Set(job.niche.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 3))
          const detectedWords = analysis.niche.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 3)
          const overlaps = detectedWords.some((w) => enteredWords.has(w))
          if (!overlaps) {
            const warning = `⚠️ Возможное несоответствие ниши: указано "${job.niche}", по анализу сайта — "${analysis.niche}". Проверить перед отправкой отчёта клиенту.`
            console.warn(`[pipeline] ${warning}`)
            await prisma.auditJob.update({
              where: { id: jobId },
              data: { adminNotes: job.adminNotes ? `${job.adminNotes}\n${warning}` : warning },
            })
          }
        }
        const effectiveBrand = resolveAuditBrand(job.companyName, analysis.companyName)
        if (effectiveBrand && effectiveBrand !== job.companyName) {
          updates.companyName = effectiveBrand
          job.companyName = effectiveBrand
        }
        // Добавляем конкурентов если не заданы
        if (analysis.suggestedCompetitors?.length && job.competitors.length === 0) {
          updates.competitors = analysis.suggestedCompetitors.slice(0, 5)
          job.competitors = updates.competitors as string[]
        }
        if (Object.keys(updates).length > 0) {
          await prisma.auditJob.update({ where: { id: jobId }, data: updates })
        }
        // Реальное описание сайта идёт в промпт генерации вопросов как источник
        // истины о нише — независимо от того, перезаписали мы поле niche или нет.
        if (analysis.description) {
          siteContext = {
            description: analysis.description,
            services: analysis.services ?? [],
            targetAudience: analysis.targetAudience ?? "",
            externalServiceEvidence: analysis.externalServiceEvidence ?? [],
            market: analysis.targetMarkets?.join(", ") || "Регион не подтверждён сайтом; не придумывай географическое ограничение",
          }
        }
      } catch (e) {
        console.error("[pipeline] Website analysis failed, using submitted data:", e)
      }
    }

    if (!job.niche?.trim() || job.niche.trim() === "Общее") {
      throw new Error("Не определена ниша бизнеса. Укажите, какие товары или услуги предлагает компания, прежде чем запускать аудит.")
    }

    const mappedJob = await prisma.auditJob.findUniqueOrThrow({where:{id:jobId}})
    const mappedSnapshot=(mappedJob.analysisSnapshot ?? {}) as Record<string,unknown>
    let businessMap=mappedSnapshot.businessMap as BusinessMap | undefined
    if(!businessMap){
      businessMap=await buildBusinessMap((mappedSnapshot.sourceDocuments ?? []) as import("../lib/questions/business-map").SourceDocument[],job.companyName)
      await prisma.auditJob.update({where:{id:jobId},data:{status:"GENERATING_QUERIES",analysisSnapshot:JSON.parse(JSON.stringify({...mappedSnapshot,businessMap,businessMapReview:{state:"pending",hash:mapHash(businessMap)}}))}})
      await notifyReviewReady(jobId,"businessMap",mapHash(businessMap),job.companyName,getMarketConfig((job.market as Market)??"ru").appUrl)
      return {jobId,awaitingBusinessMapApproval:true}
    }
    const mapReview=mappedSnapshot.businessMapReview as {state:string;hash:string}|undefined
    if(mapReview?.state!=="approved"||mapReview.hash!==mapHash(businessMap))return {jobId,awaitingBusinessMapApproval:true}
    siteContext={...(siteContext ?? {description:job.niche,services:[],targetAudience:""}),businessMap}

    // ── Step 1: Generate queries ──────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "GENERATING_QUERIES" } })

    // Load custom prompts from BrandProfile if linked
    let customPrompts: string[] = []
    if (job.brandProfileId) {
      const bp = await prisma.brandProfile.findUnique({
        where: { id: job.brandProfileId },
        select: { customPrompts: true },
      })
      if (bp?.customPrompts) {
        const prompts = bp.customPrompts as { text: string; enabled: boolean }[]
        customPrompts = prompts.filter((p) => p.enabled).map((p) => p.text)
      }
    }

    const optimizerHints = undefined

    const savedQueries = resume && Array.isArray(job.generatedQueries) && job.generatedQueries.every(q => typeof q === "string")
      ? job.generatedQueries as string[] : null
    const queries = savedQueries?.length ? savedQueries : await generateQueries(
      job.companyName,
      job.niche,
      job.competitors,
      baseTier,
      customPrompts,
      siteContext,
      optimizerHints,
      excludedPlatforms
    )

    if (queries.length !== config.queryCount || new Set(queries).size !== queries.length) throw new Error("Question set does not match the tariff; start a new baseline for a changed tariff")

    // Human approval is bound to the exact question version and cannot be bypassed by retries.
    const reviewJob = await prisma.auditJob.findUniqueOrThrow({ where: { id: jobId } })
    const reviewSnapshot = (reviewJob.analysisSnapshot ?? {}) as Record<string, unknown>
    const cardVersion=cardsVersion(queries,businessMap)
    let questionCards=reviewSnapshot.questionCards as QuestionCard[]|undefined
    if(reviewSnapshot.questionCardsVersion!==cardVersion||!questionCards){
      questionCards=await reviewQuestions(queries,businessMap,reviewFeedback(reviewSnapshot))
      await prisma.auditJob.update({where:{id:jobId},data:{analysisSnapshot:JSON.parse(JSON.stringify({...reviewSnapshot,questionCards,questionCardsVersion:cardVersion}))}})
      reviewSnapshot.questionCards=questionCards;reviewSnapshot.questionCardsVersion=cardVersion
    }
    if (!isQuestionSetApproved(queries, reviewSnapshot.questionReview as QuestionReview | undefined)) {
      await prisma.auditJob.update({ where: { id: jobId }, data: {
        generatedQueries: queries, status: "GENERATING_QUERIES",
        analysisSnapshot: JSON.parse(JSON.stringify({ ...reviewSnapshot, questionReview: {
          hash: questionHash(queries), state: "pending", notes: (reviewSnapshot.questionReview as QuestionReview | undefined)?.notes ?? "",
        } })),
      } })
      await notifyReviewReady(jobId,"questions",questionHash(queries),job.companyName,getMarketConfig((job.market as Market)??"ru").appUrl)
      return { jobId, awaitingQuestionApproval: true }
    }

    assertCardsApproved(questionCards,queries,businessMap)

    // ── Step 2: Execute queries — only platforms for this tier ────────────
    const questionSnapshot = await prisma.auditJob.findUniqueOrThrow({ where: { id: jobId }, select: { analysisSnapshot: true } })
    await prisma.auditJob.update({ where: { id: jobId }, data: {
      status: "EXECUTING_QUERIES", generatedQueries: queries,
      ...(!savedQueries ? { analysisSnapshot: JSON.parse(JSON.stringify({ ...(questionSnapshot.analysisSnapshot as object ?? {}), questionSetVersion: METHODOLOGY_VERSION })) } : {}),
    } })

    // Идемпотентность при ретрае Trigger.dev (retry.maxAttempts: 2): если предыдущая
    // попытка успела частично или полностью выполнить запросы, но упала на более позднем
    // шаге (например PDF), без этой очистки повторная попытка задваивала бы QueryResult.
    const savedResults = await prisma.queryResult.findMany({ where: { jobId }, select: { platform: true, query: true, response: true } })
    const missingQueries = (platform: string) => queries.filter(query => !savedResults.some(result => result.platform === platform && result.query === query && result.response.trim()))

    // Пересекаем тарифные платформы с теми у которых есть ключи
    const activePlatforms = getActivePlatforms()
    // Выбранные платформы ограничиваем тарифными (защита от API-обхода лимитов)
    const basePlatforms = job.selectedPlatforms.length > 0
      ? job.selectedPlatforms.filter((p) => config.platforms.includes(p))
      : config.platforms
    const tierPlatforms = basePlatforms.filter((p) => activePlatforms.includes(p) && !excludedPlatforms.includes(p))
    const suspendedByKey = config.platforms.filter((p) => !activePlatforms.includes(p))
    if (suspendedByKey.length > 0) {
      console.warn(`[platforms] Приостановлены (нет ключей): ${suspendedByKey.join(", ")}`)
    }

    const expectedPlatforms = [...new Set([...basePlatforms.filter(p => !excludedPlatforms.includes(p)), ...savedResults.map(r => r.platform)])].filter(p => config.platforms.includes(p as never))
    if (!expectedPlatforms.length) throw new Error("No platforms available for this audit")
    const unavailablePlatforms=expectedPlatforms.filter(p=>!activePlatforms.includes(p))
    if(unavailablePlatforms.length)throw Error(`Опрос не запущен: не настроены платформы ${unavailablePlatforms.join(", ")}. Укажите доступный состав при создании аудита или настройте платформы. Нельзя оплачивать остальные ответы, зная, что полный состав недоступен.`)
    const { platformsToUse, skippedPlatforms } = tierPlatforms.some(p => missingQueries(p).length > 0)
      ? await assertCanStartAudit(tierPlatforms.filter(p => missingQueries(p).length > 0))
      : { platformsToUse: [], skippedPlatforms: [] }
    if (skippedPlatforms.length > 0) {
      console.warn(`[risk-agent] Пропущены из-за лимитов: ${skippedPlatforms.join(", ")}`)
    }

    // Human review may take hours: check again if the successful probe has expired.
    if(platformsToUse.length)await withInternalUsage(jobId,"preflight-before-survey",()=>ensurePlatformsReady(jobId,[...new Set([...platformsToUse,"CHATGPT","GEMINI"])]))

    await prisma.auditJob.update({ where: { id: jobId }, data: { selectedPlatforms: expectedPlatforms as never } })

    const executionOutcomes = await Promise.allSettled(
      platformsToUse.map((platform) =>
        executeQueriesOnPlatform(jobId, missingQueries(platform), platform, job.companyName, job.websiteUrl, job.competitors)
      )
    )

    await prisma.auditJob.update({ where: { id: jobId }, data: {
      executionDiagnostics: platformsToUse.map((platform, index) => {
        const outcome = executionOutcomes[index]
        return outcome.status === "fulfilled"
          ? { platform, attempted: missingQueries(platform).length, answered: outcome.value.results.length, failures: outcome.value.failures }
          : { platform, attempted: missingQueries(platform).length, answered: 0, failures: [{ error: "Platform execution failed" }] }
      }),
    } })

    // ── Step 3: Analysis ──────────────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "ANALYZING" } })

    const storedResults = await prisma.queryResult.findMany({ where: { jobId }, orderBy: { createdAt: "asc" } })
    const allResults = uniqueAnswers(storedResults.filter(r => queries.includes(r.query) && expectedPlatforms.includes(r.platform)))
    const retainedIds = new Set(allResults.map(r => r.id))
    const obsoleteIds = storedResults.filter(r => !retainedIds.has(r.id)).map(r => r.id)
    if (obsoleteIds.length) await prisma.queryResult.deleteMany({ where: { jobId, id: { in: obsoleteIds } } })
    const coverage = checkCoverage(queries, expectedPlatforms, allResults)
    if (coverage.some(c => c.missing.length)) throw new Error(`Incomplete audit: ${coverage.filter(c => c.missing.length).map(c => `${c.platform}: missing ${c.missing.length}/${c.expected}`).join("; ")}`)

    const fingerprint = analysisFingerprint({ version: METHODOLOGY_VERSION, internalModels: INTERNAL_MODEL_VERSION, measurementRules:measurementVersion(businessMap,questionCards), company: job.companyName, niche: job.niche, evidence: siteEvidence, answers: allResults.map(r => [r.id, r.platform, r.query, r.response]).sort((a, b) => a[0].localeCompare(b[0])) })
    if (config.hasCompetitorMatrix) {
      const evidence = await cachedAnalysisStage(jobId, "competitor-discovery", fingerprint, () => discoverCompetitors(allResults, job.companyName, job.niche))
      job.competitors = namedCompetitors([...new Set([...job.competitors, ...evidence.map(e => e.name)])]).slice(0,baseTier==="BASIC"?3:10)
      for (const row of allResults) {
        row.competitors = extractMentions(row.response, job.companyName, job.websiteUrl, job.competitors, row.sources).competitors
        await prisma.queryResult.update({ where: { id: row.id }, data: { competitors: row.competitors } })
      }
      const latest = await prisma.auditJob.findUniqueOrThrow({ where: { id: jobId } })
      await prisma.auditJob.update({ where: { id: jobId }, data: { competitors: job.competitors, analysisSnapshot: JSON.parse(JSON.stringify({ ...(latest.analysisSnapshot as object ?? {}), competitorEvidence: evidence, competitorScope: "Alternatives observed in AI answers; not an independently verified market census" })) } })
    }

    if (allResults.length === 0) throw new Error("Ни одна AI-платформа не вернула ответы. Отчёт не сформирован.")
    const snapshotJob = await prisma.auditJob.findUniqueOrThrow({ where: { id: jobId } })
    await prisma.auditJob.update({ where: { id: jobId }, data: { analysisSnapshot: JSON.parse(JSON.stringify({ ...(snapshotJob.analysisSnapshot as object ?? {}), internalModels: { version: INTERNAL_MODEL_VERSION, analysis: INTERNAL_FLASH_MODEL, classification: INTERNAL_LITE_MODEL }, methodologyVersion: METHODOLOGY_VERSION, questionOrigin: "synthetic", coverage, brandRecognition: allResults.filter(r => isBrandQuestion(r.query)).map(r => ({ platform: r.platform, query: r.query, responseId: r.id, mentioned: r.brandMentioned, sources: r.sources })) })) } })
    const entityMeasurements=measureEntities(allResults,questionCards,businessMap)
    const entityVersion=measurementVersion(businessMap,questionCards)
    const latestMeasurementJob=await prisma.auditJob.findUniqueOrThrow({where:{id:jobId}})
    await prisma.auditJob.update({where:{id:jobId},data:{analysisSnapshot:JSON.parse(JSON.stringify({...((latestMeasurementJob.analysisSnapshot??{}) as object),entityMeasurements,entityMeasurementVersion:entityVersion,scoreVersion:"entity-frequency-v1",overallScoreScope:"share of spontaneous answers mentioning their approved target; recognition excluded"}))}})
    const scopedResults=projectEntityAnswers(allResults,questionCards)
    if(!scopedResults.length)throw Error("Нет спонтанных вопросов для утверждённых направлений")
    const platformScores = calculateVisibilityScores(scopedResults)
    for(const score of Object.values(platformScores)){score.score=Math.round(100*score.mentionCount/score.totalQueries);score.rawScore=score.score;delete score.capApplied}
    const overallScore = calculateOverallScore(platformScores)
    const competitorMatrix = config.hasCompetitorMatrix
      ? buildCompetitorMatrix(scopedResults, job.competitors)
      : []
    const weakPoints = [{id:"scoped-coverage",title:"Охват выбранных сущностей",detected:overallScore<100,severity:"medium" as const,description:`Целевая сущность найдена в ${scopedResults.filter(r=>r.brandMentioned).length} из ${scopedResults.length} спонтанных ответов. Это частота упоминаний, не доказательство причины или рекомендация модели.`}]
    const sourcesReport = aggregateSources(allResults, job.websiteUrl, job.competitors)

    // Historical industry scores use a different denominator and are not comparable.
    const nicheBenchmark = undefined

    // ── Step 4: Advanced — параллельный запуск агентов анализа ───────────
    let competitorAnalysis: string | undefined
    let gapsAnalysis: string | undefined
    let sentimentAnalysis: string | undefined
    let contentRecommendationsRaw: Awaited<ReturnType<typeof runContentAgent>> | undefined
    let contentRecommendations: string | undefined
    let competitorGaps: Awaited<ReturnType<typeof runCompetitorGapsAgent>> | undefined

    if (isAdvanced) {
      // Sequential stages respect provider rate limits. Completed stages survive retries.
      competitorAnalysis = await cachedAnalysisStage(jobId, "competitors", fingerprint, () => runAnalysisAgent(jobId, "competitors"))
      gapsAnalysis = await cachedAnalysisStage(jobId, "gaps", `${fingerprint}:evidence-v4`, () => runAnalysisAgent(jobId, "gaps"))
      sentimentAnalysis = await cachedAnalysisStage(jobId, "sentiment", fingerprint, () => runAnalysisAgent(jobId, "sentiment"))
      contentRecommendationsRaw = await cachedAnalysisStage(jobId, "content", fingerprint, () => runContentAgent({
        verifiedEvidence: {siteEvidence,businessMap,entityMeasurements}, companyName: job.companyName, niche: job.niche,
        weakPoints: weakPoints.filter(w => w.detected).map(w => w.title), competitorStrengths: [],
      }))
      competitorGaps = await cachedAnalysisStage(jobId, "competitor-gaps", fingerprint, () => runCompetitorGapsAgent(jobId, job.competitors))
      const semanticStats = await cachedAnalysisStage(jobId, "semantic", `${fingerprint}:${INTERNAL_LITE_MODEL}`, () => runSemanticAnalysisAgent(jobId))
      console.log(`[pipeline] Semantic analysis: ${semanticStats.classified}/${semanticStats.total}`)
      contentRecommendations = JSON.stringify(contentRecommendationsRaw, null, 2)
    }

    // Персистится в Report.analysisNotes / Report.contentRecommendations / Report.competitorGaps —
    // раньше эти платные LLM-вызовы использовались только как контекст для growth-plan-agent и выбрасывались.
    const analysisNotes = (gapsAnalysis || sentimentAnalysis)
      ? { gapsAnalysis: gapsAnalysis ?? "", sentimentAnalysis: sentimentAnalysis ?? "", competitorAnalysis: competitorAnalysis ?? "" }
      : undefined

    // ── Step 5: Action Plan / Growth Plan ─────────────────────────────────
    let actionPlan: object = { "30d": [], "60d": [], "90d": [] }

    if (config.hasActionPlan) {
      if (isAdvanced) {
        // Advanced: детальный план внедрения с конкретными шагами
        actionPlan = await cachedAnalysisStage(jobId, "growth-plan", `${fingerprint}:evidence-v4`, () => runGrowthPlanAgent({
          verifiedEvidence: {siteEvidence,businessMap,entityMeasurements},
          companyName: job.companyName,
          niche: job.niche,
          websiteUrl: job.websiteUrl,
          overallScore,
          weakPoints,
          platformScores,
          competitors: job.competitors,
          competitorAnalysis,
          gapsAnalysis,
          sentimentAnalysis,
          contentRecommendations,
        }))
      } else {
        // Standard: базовый план (GPT-4o-mini)
        actionPlan = await cachedAnalysisStage(jobId, "action-plan", fingerprint, () => generateActionPlan(
          job.companyName, job.niche, weakPoints, platformScores, overallScore,
          baseTier, {siteEvidence,businessMap,entityMeasurements}
        ))
      }
    }

    /* eslint-disable @typescript-eslint/no-explicit-any */
    // upsert, а не create — если предыдущая попытка (Trigger.dev retry) уже успела
    // создать Report и упала позже (например на PDF), create() падал бы на
    // unique-constraint по jobId вместо того чтобы просто обновить свежими данными.
    const reportData = {
      visibilityScores: platformScores as any,
      competitorMatrix:  competitorMatrix as any,
      weakPoints:        weakPoints as any,
      actionPlan:        actionPlan as any,
      overallScore,
      sourcesReport:     sourcesReport as any,
      nicheBenchmark:    (nicheBenchmark as any) ?? null,
      competitorGaps:    (competitorGaps as any) ?? null,
      analysisNotes:     (analysisNotes as any) ?? null,
      contentRecommendations: (contentRecommendationsRaw as any) ?? null,
    }
    await prisma.report.upsert({
      where: { jobId },
      create: {
        jobId,
        ...reportData,
      },
      update: { ...reportData, websiteFix: Prisma.DbNull },
    })
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // ── Step 6: PDF (Standard+) ───────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "GENERATING_REPORT" } })

    let pdfUrl: string | undefined
    if (config.hasPdf) {
      pdfUrl = await renderAndUploadPdf(jobId)
      await prisma.auditJob.update({ where: { id: jobId }, data: { pdfUrl } })
    }

    if (validation) {
      await prisma.auditJob.update({ where: { id: jobId }, data: { status: "COMPLETED", completedAt: new Date(), errorMessage: null } })
      return { jobId, overallScore, pdfUrl, validation: true, delivered: false }
    }

    // ── Step 7: Email delivery ────────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "DELIVERING" } })

    const reportUrl = `${getMarketConfig((job.market as Market) ?? "ru").appUrl}/report/${jobId}?token=${job.reportToken}`

    if (job.baselineJobId) {
      const baselineReport = await prisma.report.findUnique({ where: { jobId: job.baselineJobId } })
      await sendFollowUpEmail({
        to: job.clientEmail,
        companyName: job.companyName,
        overallScore,
        baselineScore: baselineReport?.overallScore ?? 0,
        reportUrl,
        pdfUrl,
      })
    } else {
      // Извлекаем quickWins из action plan для тела письма (STANDARD/ADVANCED)
      const ap = actionPlan as { quickWins?: { action: string }[] }
      const quickWinsForEmail = ap.quickWins?.slice(0, 3).map((w) => w.action) ?? []

      await sendReportEmail({
        to: job.clientEmail,
        companyName: job.companyName,
        overallScore,
        reportUrl,
        pdfUrl: pdfUrl ?? "",
        hasActionPlan: config.hasActionPlan,
        quickWins: quickWinsForEmail,
      })

      // Запускаем post-audit email sequence (Trial / Basic / Standard / Advanced)
      // Не запускаем для follow-up аудитов (baselineJobId уже проверен выше)
      await tasks.trigger<typeof postAuditSequence>("post-audit-sequence", {
        jobId: job.id,
        tier: job.tier,
        isTrial: job.source === "trial",
      }).catch((err) => {
        console.warn("[audit-pipeline] post-audit-sequence trigger failed (non-critical):", err)
      })
    }

    // ── Done ──────────────────────────────────────────────────────────────
    await prisma.auditJob.update({
      where: { id: jobId },
      data: { status: "COMPLETED", completedAt: new Date(), errorMessage: null },
    })

    notifyAuditCompleted({
      companyName: job.companyName,
      clientEmail: job.clientEmail,
      tier: job.tier,
      overallScore,
      reportUrl,
      jobId,
      isFollowUp: !!job.baselineJobId,
    }).catch(console.error)

    return { jobId, overallScore, pdfUrl }
}
