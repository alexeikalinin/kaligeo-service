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
      <p className="text-sm py-8 text-center" style={{ color: "var(--ink-3)" }}>
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
            className="px-3 py-1 rounded text-xs font-medium transition-colors"
            style={
              sort === key
                ? { background: "var(--ink)", color: "var(--bone)" }
                : { background: "var(--bone-2)", color: "var(--ink-2)", border: "1px solid var(--rule)" }
            }
          >
            {key === "mentionCount" ? "По упоминаниям" : "По имени"}
          </button>
        ))}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr
            className="text-left text-xs border-b"
            style={{ borderColor: "var(--rule)", color: "var(--ink-3)" }}
          >
            <th className="pb-3 pr-4 font-medium">Конкурент</th>
            <th className="pb-3 pr-4 font-medium">Упоминаний</th>
            <th className="pb-3 font-medium">Платформы</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr
              key={c.name}
              className="border-b hover:bg-[var(--bone-2)] transition-colors"
              style={{ borderColor: "var(--rule)" }}
            >
              <td className="py-3 pr-4 font-medium" style={{ color: "var(--ink)" }}>
                {c.name}
              </td>
              <td className="py-3 pr-4" style={{ color: "var(--ink-2)" }}>
                <span className="font-mono">{c.mentionCount}</span>
              </td>
              <td className="py-3">
                <div className="flex flex-wrap gap-1">
                  {c.platforms.map((p) => (
                    <span key={p} className="monotag">
                      {PLATFORM_SHORT[p] ?? p}
                    </span>
                  ))}
                  {c.platforms.length === 0 && (
                    <span style={{ color: "var(--ink-3)" }} className="text-xs">
                      —
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs mt-3" style={{ color: "var(--ink-3)" }}>
        vs. {companyName}
      </p>
    </div>
  )
}
