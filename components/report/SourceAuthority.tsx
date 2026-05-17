export interface SourceEntry {
  domain: string
  url?: string
  mentionCount: number
  competitors: string[]
  type: "catalog" | "media" | "expert" | "social" | "official"
}

interface SourceAuthorityProps {
  sources: SourceEntry[]
  companyName: string
  youPresent: string[]
}

const TYPE_ICON: Record<SourceEntry["type"], string> = {
  media:    "📰",
  catalog:  "📋",
  expert:   "🎓",
  social:   "💬",
  official: "🏢",
}

const TYPE_LABEL: Record<SourceEntry["type"], string> = {
  media:    "медиа",
  catalog:  "каталог",
  expert:   "экспертный",
  social:   "соцсети",
  official: "официальный",
}

export function SourceAuthority({ sources, companyName, youPresent }: SourceAuthorityProps) {
  const sorted = [...sources].sort((a, b) => b.mentionCount - a.mentionCount).slice(0, 8)
  const maxCount = sorted.length > 0 ? Math.max(...sorted.map((s) => s.mentionCount)) : 1

  return (
    <section>
      <p className="t-eyebrow mb-1">AI-авторитет</p>
      <h2
        className="text-lg font-bold mb-1"
        style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
      >
        Откуда AI берёт данные о конкурентах
      </h2>
      <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
        Источники которые формируют авторитет в вашей нише. Присутствие в них — прямой путь к росту
        AI-видимости.
      </p>

      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--rule)" }}
      >
        {sorted.map((source, idx) => {
          const isPresent = youPresent.includes(source.domain)
          const barPct = (source.mentionCount / maxCount) * 100

          return (
            <div
              key={source.domain}
              className="px-5 py-4 flex items-center gap-4"
              style={{
                background: idx % 2 === 0 ? "var(--bone-2)" : "var(--bone)",
                borderBottom: idx < sorted.length - 1 ? "1px solid var(--rule)" : "none",
              }}
            >
              {/* Icon + domain */}
              <div className="shrink-0 w-7 text-lg text-center">{TYPE_ICON[source.type]}</div>
              <div className="w-36 shrink-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}
                >
                  {source.domain}
                </p>
                <span className="monotag mt-1">{TYPE_LABEL[source.type]}</span>
              </div>

              {/* Bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${barPct}%`,
                      background: "var(--ink)",
                      minWidth: "4px",
                    }}
                  />
                  <span
                    className="text-xs shrink-0"
                    style={{ fontFamily: "var(--font-mono)", color: "var(--ink-3)" }}
                  >
                    {source.mentionCount}
                  </span>
                </div>
                {/* Competitor tags */}
                <div className="flex flex-wrap gap-1">
                  {source.competitors.map((c) => (
                    <span
                      key={c}
                      className="monotag"
                      style={{ fontSize: "9px", padding: "2px 5px" }}
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Presence indicator */}
              <div className="shrink-0 text-right w-28">
                {isPresent ? (
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#16a34a", fontFamily: "var(--font-mono)" }}
                  >
                    Вы здесь ✓
                  </span>
                ) : (
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className="text-xs font-medium"
                      style={{ color: "#ef4444", fontFamily: "var(--font-mono)" }}
                    >
                      Вас нет ✗
                    </span>
                    {source.type === "catalog" && source.url && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="monotag"
                        style={{
                          fontSize: "9px",
                          padding: "2px 5px",
                          color: "var(--ink)",
                          borderColor: "var(--ink)",
                          textDecoration: "none",
                        }}
                      >
                        Добавиться →
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-xs mt-3" style={{ color: "var(--ink-3)" }}>
        Упоминания в источниках с высоким авторитетом домена дают прямой прирост AI-видимости в течение 4–8 недель.
      </p>
    </section>
  )
}
