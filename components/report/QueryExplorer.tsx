"use client"

import { useState } from "react"

interface QueryResult {
  id: string
  platform: string
  query: string
  response: string
  brandMentioned: boolean
  sentiment: string
  sources?: string[]
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

const SENTIMENT_CONFIG: Record<string, { label: string; color: string }> = {
  positive: { label: "Позитив", color: "var(--accent)" },
  neutral: { label: "Нейтрально", color: "var(--ink-3)" },
  negative: { label: "Негатив", color: "#ef4444" },
  absent: { label: "Не упомянут", color: "var(--ink-3)" },
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

  const inputStyle = {
    background: "var(--bone-2)",
    border: "1px solid var(--rule)",
    color: "var(--ink)",
    borderRadius: "var(--radius-md)",
    padding: "6px 12px",
    fontSize: "14px",
    outline: "none",
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по запросу..."
          className="flex-1 min-w-48"
          style={inputStyle}
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          style={inputStyle}
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
          style={inputStyle}
        >
          <option value="all">Все упоминания</option>
          <option value="yes">Только упомянутые</option>
          <option value="no">Не упомянутые</option>
        </select>
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
        {filtered.length} из {results.length} запросов
      </p>

      <div className="space-y-2">
        {filtered.map((r) => {
          const sentiment = SENTIMENT_CONFIG[r.sentiment] ?? SENTIMENT_CONFIG.absent
          const isOpen = expanded === r.id

          return (
            <div
              key={r.id}
              className="rounded-lg overflow-hidden"
              style={{ border: "1px solid var(--rule)" }}
            >
              <button
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--bone-2)] transition-colors"
                onClick={() => setExpanded(isOpen ? null : r.id)}
              >
                <span className="text-xs pt-0.5 shrink-0 w-16 font-mono" style={{ color: "var(--ink-3)" }}>
                  {PLATFORM_LABELS[r.platform] ?? r.platform}
                </span>
                <span className="flex-1 text-sm" style={{ color: "var(--ink-2)" }}>
                  {r.query}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="monotag" style={{ color: sentiment.color, borderColor: sentiment.color }}>
                    {sentiment.label}
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--rule)" }}>
                  <p className="text-xs mt-3 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>
                    {r.response}
                  </p>
                  {r.sources && r.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--rule)" }}>
                      <p className="t-eyebrow mb-2">Источники ({r.sources.length})</p>
                      <div className="flex flex-wrap gap-2">
                        {r.sources.map((url, i) => {
                          const domain = (() => { try { return new URL(url).hostname.replace("www.", "") } catch { return url } })()
                          return (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                               className="monotag text-xs hover:opacity-70 transition-opacity"
                               style={{ color: "var(--ink-2)" }}>
                              {domain}
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
