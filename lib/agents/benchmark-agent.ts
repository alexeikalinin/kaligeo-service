/**
 * benchmark-agent — сравнивает score клиента с медианой по нише.
 *
 * Чисто аналитический агент без LLM-вызовов.
 * Читает исторические Report из БД → считает распределение → возвращает контекст.
 *
 * Используется для добавления строки "Ты в топ-30% для B2B SaaS" в отчёт.
 *
 * Вызывается из:
 * - audit-pipeline.ts Step 3 (после подсчёта overallScore)
 * - report-agent.ts (при regeneration executiveSummary)
 * - orchestrator (через invoke_benchmark_agent)
 */

import { prisma } from "../prisma"

export interface NicheBenchmark {
  niche: string
  overallScore: number         // score текущей компании
  samplesCount: number         // кол-во аудитов в нише для сравнения
  nicheMedian: number          // медиана score в нише
  nicheAverage: number         // среднее score в нише
  nicheMin: number
  nicheMax: number
  percentile: number           // 0–100, какой % компаний ниже текущей
  tier: "top" | "above_avg" | "average" | "below_avg" | "bottom"
  tierLabel: string            // человекочитаемое, напр. "Топ 20% в нише"
  contextPhrase: string        // готовая фраза для отчёта
}

function calcPercentile(scores: number[], target: number): number {
  if (scores.length === 0) return 50
  const below = scores.filter((s) => s < target).length
  return Math.round((below / scores.length) * 100)
}

function calcMedian(scores: number[]): number {
  if (scores.length === 0) return 0
  const sorted = [...scores].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

export async function runBenchmarkAgent(
  niche: string,
  overallScore: number
): Promise<NicheBenchmark> {
  // Нечёткий поиск по нише — ищем по первому значимому слову
  const nicheKeyword = niche.split(/[\s,]/)[0].toLowerCase()

  const historicalReports = await prisma.report.findMany({
    where: {
      job: {
        niche: { contains: nicheKeyword, mode: "insensitive" },
        status: "COMPLETED",
      },
    },
    select: { overallScore: true },
    take: 500,
    orderBy: { createdAt: "desc" },
  })

  const scores = historicalReports.map((r) => r.overallScore)

  if (scores.length < 5) {
    // Недостаточно данных — возвращаем нейтральный результат
    return {
      niche,
      overallScore,
      samplesCount: scores.length,
      nicheMedian: 0,
      nicheAverage: 0,
      nicheMin: 0,
      nicheMax: 0,
      percentile: 50,
      tier: "average",
      tierLabel: "Недостаточно данных для сравнения",
      contextPhrase: "Ваш результат сравнивается с растущей базой аудитов KaliGEO.",
    }
  }

  const nicheMedian = calcMedian(scores)
  const nicheAverage = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  const nicheMin = Math.min(...scores)
  const nicheMax = Math.max(...scores)
  const percentile = calcPercentile(scores, overallScore)

  let tier: NicheBenchmark["tier"]
  let tierLabel: string
  let contextPhrase: string

  if (percentile >= 80) {
    tier = "top"
    tierLabel = `Топ ${100 - percentile}% в нише`
    contextPhrase = `Вы входите в топ ${100 - percentile}% компаний вашей ниши по AI-видимости. Медиана ниши — ${nicheMedian}/100.`
  } else if (percentile >= 60) {
    tier = "above_avg"
    tierLabel = "Выше среднего"
    contextPhrase = `Ваш score выше среднего по нише (медиана: ${nicheMedian}/100). Есть потенциал для входа в топ.`
  } else if (percentile >= 40) {
    tier = "average"
    tierLabel = "Средний уровень"
    contextPhrase = `Ваш score на уровне медианы ниши (${nicheMedian}/100). ${scores.length} аудитов в базе сравнения.`
  } else if (percentile >= 20) {
    tier = "below_avg"
    tierLabel = "Ниже среднего"
    contextPhrase = `Ваш score ниже медианы ниши (${nicheMedian}/100). Конкуренты более заметны в AI-ответах.`
  } else {
    tier = "bottom"
    tierLabel = "Нижние 20%"
    contextPhrase = `AI-видимость значительно ниже большинства конкурентов в нише (медиана: ${nicheMedian}/100). Это точка роста.`
  }

  return {
    niche,
    overallScore,
    samplesCount: scores.length,
    nicheMedian,
    nicheAverage,
    nicheMin,
    nicheMax,
    percentile,
    tier,
    tierLabel,
    contextPhrase,
  }
}
