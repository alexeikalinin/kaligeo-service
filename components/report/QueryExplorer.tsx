"use client"

import { useState } from "react"

interface QueryResult {
  id: string
  platform: string
  query: string
  response: string
  brandMentioned: boolean
  sentiment: string
}

interface Props {
  results: QueryResult[]
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

const SENTIMENT_CONFIG: Record<string, { label: string; cls: string }> = {
  positive: { label: "Позитив", cls: "bg-emerald-900/30 text-emerald-400" },
  neutral: { label: "Нейтрально", cls: "bg-zinc-700 text-zinc-400" },
  negative: { label: "Негатив", cls: "bg-red-900/30 text-red-400" },
  absent: { label: "Не упомянут", cls: "bg-zinc-800 text-zinc-500" },
}

export function QueryExplorer({ results }: Props) {
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState("ALL")
  const [mentioned, setMentioned] = useState<"all" | "yes" | "no">("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  const platforms = ["ALL", ...Array.from(new Set(results.map((r) => r.platform)))]

  const filtered = results.filter((r) => {
    if (platform !== "ALL" && r.platform !== platform) return false
    if (mentioned === "yes" && !r.brandMentioned) return false
    if (mentioned === "no" && r.brandMentioned) return false
    if (search && !r.query.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по запросу..."
          className="flex-1 min-w-48 bg-zinc-800 text-zinc-200 placeholder-zinc-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-600"
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="bg-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-sm outline-none"
        >
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p === "ALL" ? "Все платформы" : (PLATFORM_LABELS[p] ?? p)}
            </option>
          ))}
        </select>
        <select
          value={mentioned}
          onChange={(e) => setMentioned(e.target.value as "all" | "yes" | "no")}
          className="bg-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-sm outline-none"
        >
          <option value="all">Все упоминания</option>
          <option value="yes">Только упомянутые</option>
          <option value="no">Не упомянутые</option>
        </select>
      </div>

      <p className="text-xs text-zinc-600 mb-4">
        {filtered.length} из {results.length} запросов
      </p>

      <div className="space-y-2">
        {filtered.map((r) => {
          const sentiment = SENTIMENT_CONFIG[r.sentiment] ?? SENTIMENT_CONFIG.absent
          const isOpen = expanded === r.id

          return (
            <div key={r.id} className="border border-zinc-800 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-zinc-800/50 transition-colors"
                onClick={() => setExpanded(isOpen ? null : r.id)}
              >
                <span className="text-xs text-zinc-600 pt-0.5 shrink-0 w-16">
                  {PLATFORM_LABELS[r.platform] ?? r.platform}
                </span>
                <span className="flex-1 text-sm text-zinc-300">{r.query}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${sentiment.cls}`}
                  >
                    {sentiment.label}
                  </span>
                  <span className="text-zinc-600 text-xs">{isOpen ? "▲" : "▼"}</span>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-400 mt-3 leading-relaxed whitespace-pre-wrap">
                    {r.response}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
