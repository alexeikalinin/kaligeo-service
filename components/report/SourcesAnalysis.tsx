"use client"

import type { SourceCategory } from "@/lib/analysis/extract-mentions"

interface DomainEntry {
  domain: string
  count: number
  category: SourceCategory
}

interface SourcesReport {
  topDomains: DomainEntry[]
  byCategory: Record<SourceCategory, { urls: string[]; count: number }>
  totalSources: number
  competitorSourceAdvantage: {
    competitor: string
    uniqueDomains: string[]
    count: number
  }[]
}

interface SourcesAnalysisProps {
  sourcesReport: SourcesReport
}

const CATEGORY_LABELS: Record<SourceCategory, { label: string; emoji: string; color: string }> = {
  official:   { label: "Ваш сайт",           emoji: "🏠", color: "#2563eb" },
  media:      { label: "СМИ и порталы",       emoji: "📰", color: "#7c3aed" },
  catalog:    { label: "Каталоги/Отзовики",   emoji: "📋", color: "#059669" },
  expert:     { label: "Профильные ресурсы",  emoji: "🎓", color: "#d97706" },
  social:     { label: "Соцсети",             emoji: "💬", color: "#db2777" },
  competitor: { label: "Конкуренты",          emoji: "⚔️",  color: "#dc2626" },
  other:      { label: "Другие",              emoji: "🔗", color: "#6b7280" },
}

export function SourcesAnalysis({ sourcesReport }: SourcesAnalysisProps) {
  const { topDomains, byCategory, totalSources, competitorSourceAdvantage } = sourcesReport

  if (totalSources === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
      >
        <p style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
          RAG-источники не обнаружены. Нейросети не цитировали внешние URL в своих ответах по данным запросам.
        </p>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
          Попробуйте добавить больше RAG-trigger запросов или создайте контент в авторитетных каталогах.
        </p>
      </div>
    )
  }

  // Подсчёт для распределения по категориям (исключаем нули)
  const categoryData = (Object.entries(byCategory) as [SourceCategory, { urls: string[]; count: number }][])
    .filter(([, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count)

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div>
        <h3 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
          RAG-источники
        </h3>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          Сайты, которые нейросети использовали как источники в своих ответах — {totalSources} упоминаний источников
        </p>
      </div>

      {/* Распределение по категориям */}
      <div
        className="rounded-xl p-5"
        style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
      >
        <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--ink)" }}>
          Типы источников
        </h4>
        <div className="space-y-3">
          {categoryData.map(([cat, data]) => {
            const meta = CATEGORY_LABELS[cat]
            const pct = Math.round((data.count / totalSources) * 100)
            return (
              <div key={cat}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span>{meta.emoji}</span>
                    <span className="text-sm" style={{ color: "var(--ink-2)" }}>{meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono" style={{ color: "var(--ink-3)" }}>
                      {data.count}
                    </span>
                    <span className="text-xs font-mono" style={{ color: "var(--ink-3)" }}>
                      {pct}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--rule)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: meta.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Топ-10 доменов */}
      {topDomains.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
        >
          <h4 className="text-sm font-semibold mb-4" style={{ color: "var(--ink)" }}>
            Топ цитируемых доменов
          </h4>
          <div className="space-y-2">
            {topDomains.slice(0, 10).map((d) => {
              const meta = CATEGORY_LABELS[d.category]
              return (
                <div key={d.domain} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0" title={meta.label}>{meta.emoji}</span>
                    <a
                      href={`https://${d.domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm truncate hover:underline"
                      style={{ color: "var(--ink-2)" }}
                    >
                      {d.domain}
                    </a>
                    <span
                      className="shrink-0 text-xs px-1.5 py-0.5 rounded"
                      style={{
                        background: `${meta.color}15`,
                        color: meta.color,
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                      }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <span
                    className="shrink-0 text-sm font-mono ml-2"
                    style={{ color: "var(--ink-3)" }}
                  >
                    ×{d.count}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Преимущество конкурентов по источникам */}
      {competitorSourceAdvantage.length > 0 && (
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
        >
          <h4 className="text-sm font-semibold mb-1" style={{ color: "var(--ink)" }}>
            Источники конкурентов, которых нет у вас
          </h4>
          <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
            Площадки, где упоминаются конкуренты, но не вы — размещение там улучшит RAG-видимость
          </p>
          <div className="space-y-4">
            {competitorSourceAdvantage.slice(0, 3).map((item) => (
              <div key={item.competitor}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold" style={{ color: "var(--ink)" }}>
                    {item.competitor}
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                    {item.count} уникальных площадок
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {item.uniqueDomains.slice(0, 6).map((domain) => (
                    <a
                      key={domain}
                      href={`https://${domain}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity"
                      style={{
                        background: "var(--rule)",
                        color: "var(--ink-2)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {domain}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
