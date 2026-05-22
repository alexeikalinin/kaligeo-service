"use client"

import { useState } from "react"
import { MENTION_CONTEXT_LABELS } from "@/lib/agents/semantic-analysis-agent"
import type { MentionContext } from "@/lib/agents/semantic-analysis-agent"

interface QueryResult {
  id: string
  platform: string
  query: string
  response: string
  brandMentioned: boolean
  sentiment: string
  sources?: string[]
  mentionContext?: MentionContext | null
  mentionQuality?: number | null
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

type Intent = "price" | "comparison" | "recommendation" | "howto" | "other"

const INTENT_CONFIG: Record<Intent, { label: string; keywords: string[]; color: string }> = {
  price:          { label: "Цена/стоимость",    keywords: ["стои", "цен", "тариф", "сколько", "бюджет", "оплат"],         color: "#f59e0b" },
  comparison:     { label: "Сравнение",          keywords: ["vs", "или", "выгоднее", "лучше", "отличи", "сравн", "versus"], color: "#8b5cf6" },
  recommendation: { label: "Рекомендация",       keywords: ["лучш", "советуе", "рекоменд", "выбрать", "какой", "какую"],   color: "#3b82f6" },
  howto:          { label: "Как сделать",        keywords: ["как ", "способ", "инструкц", "пошагово", "метод", "что дела"], color: "#10b981" },
  other:          { label: "Другое",             keywords: [],                                                              color: "var(--ink-3)" },
}

function classifyIntent(query: string): Intent {
  const lower = query.toLowerCase()
  for (const [intent, cfg] of Object.entries(INTENT_CONFIG) as [Intent, typeof INTENT_CONFIG[Intent]][]) {
    if (intent === "other") continue
    if (cfg.keywords.some((kw) => lower.includes(kw))) return intent
  }
  return "other"
}

function QueryRow({ r, expanded, onToggle }: { r: QueryResult; expanded: boolean; onToggle: () => void }) {
  const sentiment = SENTIMENT_CONFIG[r.sentiment] ?? SENTIMENT_CONFIG.absent
  const intent = classifyIntent(r.query)
  const intentCfg = INTENT_CONFIG[intent]
  const mentionCtx = r.mentionContext ? MENTION_CONTEXT_LABELS[r.mentionContext] : null

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--rule)" }}>
      <button
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--bone-2)] transition-colors"
        onClick={onToggle}
      >
        <span className="text-xs pt-0.5 shrink-0 w-16 font-mono" style={{ color: "var(--ink-3)" }}>
          {PLATFORM_LABELS[r.platform] ?? r.platform}
        </span>
        <span className="flex-1 text-sm" style={{ color: "var(--ink-2)" }}>
          {r.query}
        </span>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {mentionCtx && (
            <span
              className="monotag text-xs"
              style={{ color: mentionCtx.color, borderColor: mentionCtx.color, background: mentionCtx.bg }}
            >
              {mentionCtx.label}
            </span>
          )}
          <span className="monotag text-xs" style={{ color: intentCfg.color, borderColor: intentCfg.color }}>
            {intentCfg.label}
          </span>
          <span className="monotag" style={{ color: sentiment.color, borderColor: sentiment.color }}>
            {sentiment.label}
          </span>
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--rule)" }}>
          <p className="text-xs mt-3 leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>
            {r.response}
          </p>
          {/* Semantic quality (ADVANCED only) */}
          {mentionCtx && r.mentionQuality != null && (
            <div className="mt-3 pt-3 border-t flex items-center gap-3" style={{ borderColor: "var(--rule)" }}>
              <span className="t-eyebrow">Качество упоминания</span>
              <span
                className="monotag text-xs"
                style={{ color: mentionCtx.color, borderColor: mentionCtx.color, background: mentionCtx.bg }}
              >
                {mentionCtx.label}
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-20 h-1.5 rounded-full" style={{ background: "var(--bone-2)" }}>
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${r.mentionQuality}%`,
                      background: r.mentionQuality >= 70 ? "#166534" : r.mentionQuality >= 40 ? "#854d0e" : "#991b1b",
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold" style={{ color: "var(--ink)" }}>
                  {r.mentionQuality}/100
                </span>
              </div>
            </div>
          )}

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
}

export function QueryExplorer({ results }: Props) {
  const [search, setSearch] = useState("")
  const [platform, setPlatform] = useState("ALL")
  const [mentioned, setMentioned] = useState<"all" | "yes" | "no">("all")
  const [groupByIntent, setGroupByIntent] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  const platforms = ["ALL", ...Array.from(new Set(results.map((r) => r.platform)))]

  const filtered = results.filter((r) => {
    if (platform !== "ALL" && r.platform !== platform) return false
    if (mentioned === "yes" && !r.brandMentioned) return false
    if (mentioned === "no" && r.brandMentioned) return false
    if (search && !r.query.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const mentionedCount = results.filter((r) => r.brandMentioned).length
  const notMentionedCount = results.length - mentionedCount
  const mentionRate = results.length > 0 ? Math.round((mentionedCount / results.length) * 100) : 0

  const inputStyle = {
    background: "var(--bone-2)",
    border: "1px solid var(--rule)",
    color: "var(--ink)",
    borderRadius: "var(--radius-md)",
    padding: "6px 12px",
    fontSize: "14px",
    outline: "none",
  }

  // Group by intent
  const grouped = groupByIntent
    ? (Object.keys(INTENT_CONFIG) as Intent[]).reduce<Record<Intent, QueryResult[]>>((acc, intent) => {
        acc[intent] = filtered.filter((r) => classifyIntent(r.query) === intent)
        return acc
      }, {} as Record<Intent, QueryResult[]>)
    : null

  return (
    <div>
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "Всего запросов",   value: results.length,     color: "var(--ink)" },
          { label: "Упоминается",      value: `${mentionedCount} (${mentionRate}%)`, color: "#16a34a" },
          { label: "Не упоминается",   value: `${notMentionedCount} (${100 - mentionRate}%)`, color: "#ef4444" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg px-4 py-3" style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}>
            <p className="t-eyebrow mb-1">{stat.label}</p>
            <p className="text-xl font-bold font-mono" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по запросу..."
          className="flex-1 min-w-48"
          style={inputStyle}
        />
        <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
          {platforms.map((p) => (
            <option key={p} value={p}>{p === "ALL" ? "Все платформы" : (PLATFORM_LABELS[p] ?? p)}</option>
          ))}
        </select>
        <select value={mentioned} onChange={(e) => setMentioned(e.target.value as "all" | "yes" | "no")} style={inputStyle}>
          <option value="all">Все упоминания</option>
          <option value="yes">Только упомянутые</option>
          <option value="no">Не упомянутые</option>
        </select>
        <button
          onClick={() => setGroupByIntent(!groupByIntent)}
          className="monotag transition-colors"
          style={groupByIntent
            ? { background: "var(--ink)", borderColor: "var(--ink)", color: "var(--bone)" }
            : { color: "var(--ink-3)" }
          }
        >
          По интенту
        </button>
      </div>

      <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
        {filtered.length} из {results.length} запросов
      </p>

      {groupByIntent && grouped ? (
        // Grouped view
        <div className="space-y-8">
          {(Object.entries(grouped) as [Intent, QueryResult[]][])
            .filter(([, items]) => items.length > 0)
            .map(([intent, items]) => {
              const cfg = INTENT_CONFIG[intent]
              const intentMentioned = items.filter((r) => r.brandMentioned).length
              return (
                <div key={intent}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="font-semibold text-sm" style={{ color: "var(--ink)" }}>{cfg.label}</span>
                    <span className="monotag text-xs" style={{ color: cfg.color, borderColor: cfg.color }}>
                      {items.length} запросов
                    </span>
                    <span className="text-xs" style={{ color: intentMentioned > 0 ? "#16a34a" : "#ef4444" }}>
                      упоминается в {intentMentioned}/{items.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {items.map((r) => (
                      <QueryRow
                        key={r.id}
                        r={r}
                        expanded={expanded === r.id}
                        onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      ) : (
        // Flat view
        <div className="space-y-2">
          {filtered.map((r) => (
            <QueryRow
              key={r.id}
              r={r}
              expanded={expanded === r.id}
              onToggle={() => setExpanded(expanded === r.id ? null : r.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
