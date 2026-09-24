import { task, tasks } from "@trigger.dev/sdk/v3"
import { postAuditSequence } from "./post-audit-sequence"
import { prisma } from "../lib/prisma"
import { runWebsiteAnalysisAgent } from "../lib/agents/website-analysis-agent"
import { executeQueriesOnPlatform } from "./steps/execute-queries"
import { generateQueries, type SiteContext } from "./steps/generate-queries"
import { runQueryOptimizerAgent } from "../lib/agents/query-optimizer-agent"
import { renderAndUploadPdf } from "./steps/render-pdf"
import { sendReportEmail, sendFollowUpEmail } from "./steps/deliver"
import { calculateVisibilityScores, calculateOverallScore } from "../lib/analysis/calculate-scores"
import { buildCompetitorMatrix } from "../lib/analysis/competitor-matrix"
import { detectWeakPoints } from "../lib/analysis/weak-points-checker"
import { aggregateSources } from "../lib/analysis/aggregate-sources"
import { generateActionPlan } from "../lib/report/action-plan-gen"
import { runGrowthPlanAgent } from "../lib/agents/growth-plan-agent"
import { runAnalysisAgent, runCompetitorGapsAgent } from "../lib/agents/analysis-agent"
import { runContentAgent } from "../lib/agents/content-agent"
import { runBenchmarkAgent } from "../lib/agents/benchmark-agent"
import { runSemanticAnalysisAgent } from "../lib/agents/semantic-analysis-agent"
import { getTierConfig, getBaseTier, type Tier } from "../lib/gates"
import { assertCanStartAudit } from "../lib/agents/risk-agent"
import { getActivePlatforms } from "../lib/ai-clients"
import { notifyAuditCompleted, notifyAuditFailed } from "../lib/notify"
import { getMarketConfig, type Market } from "../lib/market"

export interface AuditPayload {
  jobId: string
}

export const auditPipeline = task({
  id: "audit-pipeline",
  maxDuration: 3600,
  retry: { maxAttempts: 2 },

  run: async (payload: AuditPayload) => {
    const { jobId } = payload

    const job = await prisma.auditJob.findUniqueOrThrow({ where: { id: jobId } })

    try {
      return await runPipeline(job)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      await prisma.auditJob.update({
        where: { id: jobId },
        data: { status: "FAILED", errorMessage },
      })
      notifyAuditFailed({
        companyName: job.companyName,
        tier: job.tier,
        jobId,
        errorMessage,
      }).catch(console.error)
      throw err
    }
  },
})

async function runPipeline(job: Awaited<ReturnType<typeof prisma.auditJob.findUniqueOrThrow>>) {
    const jobId = job.id
    const tier = job.tier as Tier
    const baseTier = getBaseTier(tier)   // MONITOR_* → BASIC/STANDARD/ADVANCED
    const config = getTierConfig(tier)
    const isAdvanced = baseTier === "ADVANCED"

    // ── Step 0: Website analysis — определяем нишу и компанию по URL ─────
    let siteContext: SiteContext | undefined
    if (job.websiteUrl) {
      try {
        const analysis = await runWebsiteAnalysisAgent(job.websiteUrl)
        const updates: Record<string, unknown> = {}
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
        // Обновляем имя компании если оно выглядит как тест/мусор (< 4 символов или нет пробелов и букв)
        const nameIsJunk = !job.companyName || job.companyName.length < 3 ||
          /^[а-яёa-z]{2,6}$/i.test(job.companyName.trim()) && !/\s/.test(job.companyName)
        if (analysis.companyName && nameIsJunk) {
          updates.companyName = analysis.companyName
          job.companyName = analysis.companyName
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
          }
        }
      } catch (e) {
        console.error("[pipeline] Website analysis failed, using submitted data:", e)
      }
    }

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

    const optimizerHints = await runQueryOptimizerAgent(job.niche, job.companyName).catch((e) => {
      console.error("[pipeline] query-optimizer-agent failed, generating without historical hints:", e)
      return undefined
    })

    const queries = await generateQueries(
      job.companyName,
      job.niche,
      job.competitors,
      baseTier,
      customPrompts,
      siteContext,
      optimizerHints
    )

    // ── Step 2: Execute queries — only platforms for this tier ────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "EXECUTING_QUERIES" } })

    // Идемпотентность при ретрае Trigger.dev (retry.maxAttempts: 2): если предыдущая
    // попытка успела частично или полностью выполнить запросы, но упала на более позднем
    // шаге (например PDF), без этой очистки повторная попытка задваивала бы QueryResult.
    await prisma.queryResult.deleteMany({ where: { jobId } })

    // Пересекаем тарифные платформы с теми у которых есть ключи
    const activePlatforms = getActivePlatforms()
    // Выбранные платформы ограничиваем тарифными (защита от API-обхода лимитов)
    const basePlatforms = job.selectedPlatforms.length > 0
      ? job.selectedPlatforms.filter((p) => config.platforms.includes(p))
      : config.platforms
    const tierPlatforms = basePlatforms.filter((p) => activePlatforms.includes(p))
    const suspendedByKey = config.platforms.filter((p) => !activePlatforms.includes(p))
    if (suspendedByKey.length > 0) {
      console.warn(`[platforms] Приостановлены (нет ключей): ${suspendedByKey.join(", ")}`)
    }

    const { platformsToUse, skippedPlatforms } = await assertCanStartAudit(tierPlatforms)
    if (skippedPlatforms.length > 0) {
      console.warn(`[risk-agent] Пропущены из-за лимитов: ${skippedPlatforms.join(", ")}`)
    }

    await Promise.allSettled(
      platformsToUse.map((platform) =>
        executeQueriesOnPlatform(jobId, queries, platform, job.companyName, job.websiteUrl, job.competitors)
      )
    )

    // ── Step 3: Analysis ──────────────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "ANALYZING" } })

    const allResults = await prisma.queryResult.findMany({ where: { jobId } })

    const platformScores = calculateVisibilityScores(allResults)
    const overallScore = calculateOverallScore(platformScores)
    const competitorMatrix = config.hasCompetitorMatrix
      ? buildCompetitorMatrix(allResults, job.competitors)
      : []
    const weakPoints = detectWeakPoints(allResults, job.websiteUrl, overallScore, job.competitors, platformScores)
    const sourcesReport = aggregateSources(allResults, job.websiteUrl, job.competitors)

    // Честный percentile компании в нише (заменяет прежний хардкод "41" в UI)
    const nicheBenchmark = config.hasBenchmark
      ? await runBenchmarkAgent(job.niche, overallScore).catch((e) => {
          console.error("[pipeline] benchmark-agent failed:", e)
          return undefined
        })
      : undefined

    // ── Step 4: Advanced — параллельный запуск агентов анализа ───────────
    let competitorAnalysis: string | undefined
    let gapsAnalysis: string | undefined
    let sentimentAnalysis: string | undefined
    let contentRecommendationsRaw: Awaited<ReturnType<typeof runContentAgent>> | undefined
    let contentRecommendations: string | undefined
    let competitorGaps: Awaited<ReturnType<typeof runCompetitorGapsAgent>> | undefined

    if (isAdvanced) {
      const [compAnalysis, gaps, sentiment, contentRecs, gapsStructured, semanticStats] = await Promise.allSettled([
        runAnalysisAgent(jobId, "competitors"),
        runAnalysisAgent(jobId, "gaps"),
        runAnalysisAgent(jobId, "sentiment"),
        runContentAgent({
          companyName: job.companyName,
          niche: job.niche,
          weakPoints: weakPoints.filter((w) => w.detected).map((w) => w.title),
          competitorStrengths: [],
        }),
        runCompetitorGapsAgent(jobId, job.competitors),
        // Волна 3: семантическая классификация упоминаний (Haiku, дешево)
        runSemanticAnalysisAgent(jobId),
      ])

      competitorAnalysis     = compAnalysis.status === "fulfilled" ? compAnalysis.value : undefined
      gapsAnalysis           = gaps.status === "fulfilled"         ? gaps.value         : undefined
      sentimentAnalysis      = sentiment.status === "fulfilled"    ? sentiment.value    : undefined
      contentRecommendationsRaw = contentRecs.status === "fulfilled" ? contentRecs.value : undefined
      competitorGaps         = gapsStructured.status === "fulfilled" ? gapsStructured.value : undefined

      contentRecommendations = contentRecommendationsRaw ? JSON.stringify(contentRecommendationsRaw, null, 2) : undefined

      if (semanticStats.status === "fulfilled") {
        console.log(`[pipeline] Semantic analysis: ${semanticStats.value.classified}/${semanticStats.value.total} mentions classified, avg quality: ${semanticStats.value.avgQuality}`)
      }
    }

    // Персистится в Report.analysisNotes / Report.contentRecommendations / Report.competitorGaps —
    // раньше эти платные LLM-вызовы использовались только как контекст для growth-plan-agent и выбрасывались.
    const analysisNotes = (gapsAnalysis || sentimentAnalysis)
      ? { gapsAnalysis: gapsAnalysis ?? "", sentimentAnalysis: sentimentAnalysis ?? "" }
      : undefined

    // ── Step 5: Action Plan / Growth Plan ─────────────────────────────────
    let actionPlan: object = { "30d": [], "60d": [], "90d": [] }

    if (config.hasActionPlan) {
      if (isAdvanced) {
        // Advanced: детальный план внедрения с конкретными шагами
        actionPlan = await runGrowthPlanAgent({
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
        })
      } else {
        // Standard: базовый план (GPT-4o-mini)
        actionPlan = await generateActionPlan(
          job.companyName, job.niche, weakPoints, platformScores, overallScore,
          baseTier
        )
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
      update: reportData,
    })
    /* eslint-enable @typescript-eslint/no-explicit-any */

    // ── Step 6: PDF (Standard+) ───────────────────────────────────────────
    await prisma.auditJob.update({ where: { id: jobId }, data: { status: "GENERATING_REPORT" } })

    let pdfUrl: string | undefined
    if (config.hasPdf) {
      pdfUrl = await renderAndUploadPdf(jobId)
      await prisma.auditJob.update({ where: { id: jobId }, data: { pdfUrl } })
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
      data: { status: "COMPLETED", completedAt: new Date() },
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
