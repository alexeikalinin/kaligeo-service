"use client"

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts"

interface PlatformScore {
  platform: string
  score: number
  citationRate: number
  totalQueries: number
  mentionCount: number
  positiveCount: number
}

interface Props {
  score: PlatformScore
}

function scoreColor(score: number) {
  if (score >= 60) return "#34d399"
  if (score >= 30) return "#fbbf24"
  return "#f87171"
}

const PLATFORM_LABELS: Record<string, string> = {
  CHATGPT: "ChatGPT",
  CLAUDE: "Claude",
  GEMINI: "Gemini",
  PERPLEXITY: "Perplexity",
  DEEPSEEK: "DeepSeek",
  YANDEXGPT: "YandexGPT",
  GIGACHAT: "GigaChat",
}

export function PlatformScoreCard({ score }: Props) {
  const data = [{ value: score.score, fill: scoreColor(score.score) }]
  const citationPct = score.totalQueries > 0
    ? Math.round((score.mentionCount / score.totalQueries) * 100)
    : 0

  return (
    <div className="bg-zinc-800 rounded-2xl p-5 flex flex-col items-center gap-3 hover:bg-zinc-750 transition-colors">
      <p className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
        {PLATFORM_LABELS[score.platform] ?? score.platform}
      </p>
      <div className="w-24 h-24 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="65%"
            outerRadius="100%"
            startAngle={90}
            endAngle={-270}
            data={data}
          >
            <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#27272a" }} />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-zinc-100">{score.score}</span>
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs text-zinc-500">
          Упоминаний: {score.mentionCount}/{score.totalQueries} ({citationPct}%)
        </p>
        <p className="text-xs text-zinc-600">Позитивных: {score.positiveCount}</p>
      </div>
    </div>
  )
}
