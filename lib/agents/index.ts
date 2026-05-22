import { runAnalysisAgent } from "./analysis-agent"
import { runContentAgent } from "./content-agent"
import { runReportAgent } from "./report-agent"
import { runWebsiteAnalysisAgent } from "./website-analysis-agent"
import { runWebsiteFixAgent } from "./website-fix-agent"
import { runRiskAgent } from "./risk-agent"
import { runOutreachAgent } from "./outreach-agent"
import { runMonitoringAgent } from "./monitoring-agent"
import { runQueryOptimizerAgent } from "./query-optimizer-agent"
import { runBenchmarkAgent } from "./benchmark-agent"
import { runLeadScorerAgent, scoreAllLeads } from "./lead-scorer-agent"

export {
  runAnalysisAgent,
  runContentAgent,
  runReportAgent,
  runWebsiteAnalysisAgent,
  runWebsiteFixAgent,
  runRiskAgent,
  runOutreachAgent,
  runMonitoringAgent,
  runQueryOptimizerAgent,
  runBenchmarkAgent,
  runLeadScorerAgent,
  scoreAllLeads,
}

export async function dispatchTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    // ── Существующие агенты ──────────────────────────────────────────────────
    case "invoke_analysis_agent": {
      const result = await runAnalysisAgent(
        input.jobId as string,
        input.analysisType as "competitors" | "sentiment" | "gaps"
      )
      return result
    }
    case "invoke_content_agent": {
      const result = await runContentAgent({
        companyName: input.companyName as string,
        niche: input.niche as string,
        weakPoints: input.weakPoints as string[],
        competitorStrengths: (input.competitorStrengths as string[]) ?? [],
      })
      return JSON.stringify(result, null, 2)
    }
    case "invoke_report_agent": {
      const result = await runReportAgent(
        input.jobId as string,
        input.section as "actionPlan" | "executiveSummary" | "platformNotes"
      )
      return JSON.stringify(result, null, 2)
    }
    case "invoke_website_analysis_agent": {
      const result = await runWebsiteAnalysisAgent(input.websiteUrl as string)
      return JSON.stringify(result, null, 2)
    }
    case "invoke_risk_agent": {
      const result = await runRiskAgent(
        (input.platforms as string[] | undefined) ?? undefined
      )
      return JSON.stringify(result, null, 2)
    }

    // ── Новые агенты ─────────────────────────────────────────────────────────
    case "invoke_outreach_agent": {
      const result = await runOutreachAgent({
        leadId: input.leadId as string,
        sequenceStep: (input.sequenceStep as number) ?? 0,
        campaignBrief: input.campaignBrief as string | undefined,
      })
      return JSON.stringify(result, null, 2)
    }
    case "invoke_monitoring_agent": {
      const result = await runMonitoringAgent(input.jobId as string)
      return JSON.stringify(result, null, 2)
    }
    case "invoke_query_optimizer_agent": {
      const result = await runQueryOptimizerAgent(
        input.niche as string,
        input.companyName as string
      )
      return JSON.stringify(result, null, 2)
    }
    case "invoke_benchmark_agent": {
      const result = await runBenchmarkAgent(
        input.niche as string,
        input.overallScore as number
      )
      return JSON.stringify(result, null, 2)
    }
    case "invoke_lead_scorer_agent": {
      if (input.leadId) {
        const result = await runLeadScorerAgent(input.leadId as string)
        return JSON.stringify(result, null, 2)
      }
      // Массовая оценка
      const results = await scoreAllLeads({
        status: input.status as string | undefined,
        niche: input.niche as string | undefined,
      })
      return JSON.stringify(results, null, 2)
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
