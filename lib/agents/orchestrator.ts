import Anthropic from "@anthropic-ai/sdk"
import { dispatchTool } from "./index"
import type { RiskReport } from "./risk-agent"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const TOOLS: Anthropic.Tool[] = [
  {
    name: "invoke_analysis_agent",
    description: "Запустить углублённый анализ результатов аудита для конкретного job",
    input_schema: {
      type: "object" as const,
      properties: {
        jobId: { type: "string", description: "ID аудит-задания" },
        analysisType: {
          type: "string",
          enum: ["competitors", "sentiment", "gaps"],
          description: "Тип анализа: конкуренты, тональность или пробелы видимости",
        },
      },
      required: ["jobId", "analysisType"],
    },
  },
  {
    name: "invoke_content_agent",
    description: "Сгенерировать контентные рекомендации для улучшения AI-видимости",
    input_schema: {
      type: "object" as const,
      properties: {
        companyName: { type: "string" },
        niche: { type: "string" },
        weakPoints: { type: "array", items: { type: "string" } },
        competitorStrengths: { type: "array", items: { type: "string" } },
      },
      required: ["companyName", "niche", "weakPoints"],
    },
  },
  {
    name: "invoke_report_agent",
    description: "Регенерировать или улучшить секцию существующего отчёта",
    input_schema: {
      type: "object" as const,
      properties: {
        jobId: { type: "string" },
        section: {
          type: "string",
          enum: ["actionPlan", "executiveSummary", "platformNotes"],
        },
      },
      required: ["jobId", "section"],
    },
  },
  {
    name: "invoke_risk_agent",
    description: "Проверить текущий уровень риска: лимиты API, глубину очереди, доступность платформ. Вызывай перед запуском ресурсоёмких операций.",
    input_schema: {
      type: "object" as const,
      properties: {
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Список платформ для проверки (опционально, по умолчанию все)",
        },
      },
      required: [],
    },
  },
  {
    name: "invoke_outreach_agent",
    description: "Сгенерировать персонализированное письмо для холодного outreach конкретного лида. Использует данные FreemiumScan если есть.",
    input_schema: {
      type: "object" as const,
      properties: {
        leadId: { type: "string", description: "ID лида из таблицы Lead" },
        sequenceStep: { type: "number", description: "Шаг последовательности: 0=первое касание, 1=follow-up, 2=финальное" },
        campaignBrief: { type: "string", description: "Опциональный контекст кампании" },
      },
      required: ["leadId"],
    },
  },
  {
    name: "invoke_monitoring_agent",
    description: "Запустить spot-check AI-видимости для существующего аудита и сравнить с baseline.",
    input_schema: {
      type: "object" as const,
      properties: {
        jobId: { type: "string", description: "ID оригинального аудита (AuditJob)" },
      },
      required: ["jobId"],
    },
  },
  {
    name: "invoke_benchmark_agent",
    description: "Сравнить score компании с медианой по её нише на основе исторических данных.",
    input_schema: {
      type: "object" as const,
      properties: {
        niche: { type: "string", description: "Ниша компании" },
        overallScore: { type: "number", description: "Текущий overall score (0–100)" },
      },
      required: ["niche", "overallScore"],
    },
  },
  {
    name: "invoke_lead_scorer_agent",
    description: "Оценить приоритет лида (hot/warm/cold) и получить рекомендацию по следующему действию.",
    input_schema: {
      type: "object" as const,
      properties: {
        leadId: { type: "string", description: "ID конкретного лида (или пропусти для массовой оценки)" },
        status: { type: "string", description: "Фильтр по статусу для массовой оценки" },
        niche: { type: "string", description: "Фильтр по нише для массовой оценки" },
      },
      required: [],
    },
  },
]

export async function runOrchestrator(
  task: string,
  context: Record<string, unknown>
): Promise<string> {
  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `Задача: ${task}\n\nКонтекст: ${JSON.stringify(context, null, 2)}`,
    },
  ]

  let iterations = 0
  const maxIterations = 10

  while (iterations < maxIterations) {
    iterations++

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: TOOLS,
      messages,
    })

    if (response.stop_reason === "end_turn") {
      const textBlock = response.content.find((b) => b.type === "text")
      return textBlock?.type === "text" ? textBlock.text : "Готово."
    }

    if (response.stop_reason === "tool_use") {
      messages.push({ role: "assistant", content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== "tool_use") continue

        let result: string
        try {
          result = await dispatchTool(block.name, block.input as Record<string, unknown>)
        } catch (err) {
          result = `Error: ${err instanceof Error ? err.message : String(err)}`
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        })
      }

      messages.push({ role: "user", content: toolResults })
    }
  }

  return "Превышен лимит итераций оркестратора."
}
