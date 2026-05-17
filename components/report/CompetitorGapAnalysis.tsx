interface CompetitorGap {
  name: string
  score: number
  theirSignals: string[]
  yourSignals: string[]
}

interface Props {
  gaps: CompetitorGap[]
  companyName: string
}

export function CompetitorGapAnalysis({ gaps, companyName }: Props) {
  if (!gaps.length) return null

  return (
    <section>
      <p className="t-eyebrow mb-2">Почему они видны, а вы нет</p>
      <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}>
        Что есть у конкурентов, чего нет у вас
      </h2>
      <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
        AI доверяет источникам которые явно заявляют о себе. Вот конкретные сигналы которые дают конкурентам преимущество.
      </p>

      <div className="space-y-4">
        {gaps.map((competitor) => (
          <div
            key={competitor.name}
            className="rounded-xl overflow-hidden"
            style={{ border: "1px solid var(--rule)" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-3"
              style={{ background: "var(--bone-2)", borderBottom: "1px solid var(--rule)" }}
            >
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm" style={{ color: "var(--ink)" }}>{competitor.name}</span>
                <span
                  className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                  style={{ background: "#16a34a", color: "#fff" }}
                >
                  Score ~{competitor.score}
                </span>
              </div>
              <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                {competitor.theirSignals.length} AI-сигналов · у вас {competitor.yourSignals.length}
              </span>
            </div>

            {/* Two-column comparison */}
            <div className="grid grid-cols-2 divide-x" style={{ borderColor: "var(--rule)" }}>
              {/* Their signals */}
              <div className="p-4">
                <p className="text-xs font-semibold mb-3" style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#16a34a" }}>
                  ✓ {competitor.name}
                </p>
                <ul className="space-y-2">
                  {competitor.theirSignals.map((signal, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
                      <span style={{ color: "#16a34a", flexShrink: 0 }}>✓</span>
                      <span>{signal}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Your signals */}
              <div className="p-4" style={{ background: "#fef2f2" }}>
                <p className="text-xs font-semibold mb-3" style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em", color: "#ef4444" }}>
                  ✗ {companyName}
                </p>
                {competitor.yourSignals.length > 0 ? (
                  <ul className="space-y-2">
                    {competitor.yourSignals.map((signal, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
                        <span style={{ color: "#16a34a", flexShrink: 0 }}>✓</span>
                        <span>{signal}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: "#ef4444" }}>
                    Ни одного из этих сигналов не обнаружено
                  </p>
                )}
                {competitor.theirSignals.length > competitor.yourSignals.length && (
                  <ul className="space-y-2 mt-2">
                    {competitor.theirSignals.slice(competitor.yourSignals.length).map((signal, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs" style={{ color: "#ef4444", opacity: 0.7 }}>
                        <span style={{ flexShrink: 0 }}>✗</span>
                        <span className="line-through">{signal}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
