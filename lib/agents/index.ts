import { runAnalysisAgent } from "./analysis-agent"
import { runContentAgent } from "./content-agent"
import { runReportAgent } from "./report-agent"
import { runWebsiteAnalysisAgent } from "./website-analysis-agent"
import { runWebsiteFixAgent } from "./website-fix-agent"
import { runRiskAgent } from "./risk-agent"

export { runAnalysisAgent, runContentAgent, runReportAgent, runWebsiteAnalysisAgent, runWebsiteFixAgent, runRiskAgent }

export async function dispatchTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
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
    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}
