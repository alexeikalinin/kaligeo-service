"use client"

import { useState } from "react"

interface CompetitorEntry {
  name: string
  platforms: string[]
  mentionCount: number
}

interface Props {
  matrix: CompetitorEntry[]
  companyName: string
}

const PLATFORM_SHORT: Record<string, string> = {
  CHATGPT: "GPT",
  CLAUDE: "Claude",
  GEMINI: "Gemini",
  PERPLEXITY: "Perp.",
  DEEPSEEK: "DS",
  YANDEXGPT: "YGPT",
  GIGACHAT: "GC",
}

type SortKey = "name" | "mentionCount"

export function CompetitorMatrixTable({ matrix, companyName }: Props) {
  const [sort, setSort] = useState<SortKey>("mentionCount")

  const sorted = [...matrix].sort((a, b) =>
    sort === "mentionCount" ? b.mentionCount - a.mentionCount : a.name.localeCompare(b.name)
  )

  if (matrix.length === 0) {
    return (
      <p className="text-zinc-500 text-sm py-8 text-center">
        Конкуренты не были указаны при запуске аудита
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-2 mb-4">
        {(["mentionCount", "name"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSort(key)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              sort === key ? "bg-zinc-600 text-zinc-100" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {key === "mentionCount" ? "По упоминаниям" : "По имени"}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-zinc-500 text-xs border-b border-zinc-800">
            <th className="pb-3 pr-4 font-medium">Конкурент</th>
            <th className="pb-3 pr-4 font-medium">Упоминаний</th>
            <th className="pb-3 font-medium">Платформы</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="py-3 pr-4 text-zinc-200 font-medium">{c.name}</td>
              <td className="py-3 pr-4 text-zinc-400">
                <span className="font-mono">{c.mentionCount}</span>
              </td>
              <td className="py-3">
                <div className="flex flex-wrap gap-1">
                  {c.platforms.map((p) => (
                    <span
                      key={p}
                      className="px-1.5 py-0.5 bg-zinc-700 text-zinc-300 rounded text-xs"
                    >
                      {PLATFORM_SHORT[p] ?? p}
                    </span>
                  ))}
                  {c.platforms.length === 0 && (
                    <span className="text-zinc-600 text-xs">—</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-zinc-600 mt-3">vs. {companyName}</p>
    </div>
  )
}
