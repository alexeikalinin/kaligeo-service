"use client"

import type { AuditComparison } from "@/lib/analysis/compare-audits"

const PLATFORM_LABELS: Record<string, string> = {
  CHATGPT: "ChatGPT",
  GEMINI: "Gemini",
  CLAUDE: "Claude",
  PERPLEXITY: "Perplexity",
  DEEPSEEK: "DeepSeek",
  YANDEXGPT: "YandexGPT",
  GIGACHAT: "GigaChat",
  ALISA: "Алиса",
}

function DeltaBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  const positive = value > 0
  const neutral = value === 0
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: "12px",
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: "4px",
        background: neutral ? "var(--bone-2)" : positive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        color: neutral ? "var(--ink-3)" : positive ? "#16a34a" : "#dc2626",
      }}
    >
      {positive ? "+" : ""}{value}{suffix}
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

export function ProgressComparison({ comparison }: { comparison: AuditComparison }) {
  const { scoreDelta, platformDeltas, weakPoints, competitors, baseline, current, daysBetween } = comparison

  return (
    <div className="space-y-10">

      {/* Timeline header */}
      <div
        className="rounded-xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
      >
        <div className="flex-1 space-y-1">
          <p className="t-eyebrow">Сравнительный анализ</p>
          <div className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--ink-2)" }}>
            <span>{formatDate(baseline.createdAt)}</span>
            <span style={{ color: "var(--ink-3)" }}>→</span>
            <span>{formatDate(current.createdAt)}</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                padding: "2px 6px",
                borderRadius: "4px",
                background: "var(--bone)",
                border: "1px solid var(--rule)",
                color: "var(--ink-3)",
              }}
            >
              {daysBetween} дн.
            </span>
          </div>
        </div>
        <div className="flex items-end gap-3">
          <div className="text-right">
            <p className="text-xs mb-1" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>БЫЛО</p>
            <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--ink-3)" }}>{baseline.overallScore}</p>
          </div>
          <div className="pb-1">
            <DeltaBadge value={scoreDelta} />
          </div>
          <div className="text-right">
            <p className="text-xs mb-1" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>СТАЛО</p>
            <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}>{current.overallScore}</p>
          </div>
        </div>
      </div>

      {/* Platform deltas table */}
      {Object.keys(platformDeltas).length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--ink)" }}>Динамика по платформам</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--rule)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bone-2)", borderBottom: "1px solid var(--rule)" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--ink-2)" }}>Платформа</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--ink-2)" }}>Было</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--ink-2)" }}>Стало</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--ink-2)" }}>Δ Score</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--ink-2)" }}>Δ Цитир.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(platformDeltas).map(([platform, delta], i) => (
                  <tr
                    key={platform}
                    style={{
                      borderTop: i > 0 ? "1px solid var(--rule)" : undefined,
                      background: "var(--bone)",
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>
                      {PLATFORM_LABELS[platform] ?? platform}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                      {delta.prevScore}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600 }}>
                      {delta.currScore}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeltaBadge value={delta.scoreDelta} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DeltaBadge value={delta.citationRateDelta} suffix="%" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Weak points */}
      <section>
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--ink)" }}>Проблемы</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
            <p className="text-sm font-bold" style={{ color: "#16a34a" }}>
              ✅ Исправлено ({weakPoints.fixed.length})
            </p>
            {weakPoints.fixed.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>Пока ничего</p>
            ) : (
              <ul className="space-y-2">
                {weakPoints.fixed.map((w) => (
                  <li key={w.id} className="text-xs" style={{ color: "var(--ink-2)" }}>{w.title}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(234,179,8,0.06)", border: "1px solid rgba(234,179,8,0.25)" }}>
            <p className="text-sm font-bold" style={{ color: "#ca8a04" }}>
              ⚠️ Осталось ({weakPoints.remaining.length})
            </p>
            {weakPoints.remaining.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>Всё решено</p>
            ) : (
              <ul className="space-y-2">
                {weakPoints.remaining.map((w) => (
                  <li key={w.id} className="text-xs" style={{ color: "var(--ink-2)" }}>{w.title}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl p-4 space-y-3" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <p className="text-sm font-bold" style={{ color: "#dc2626" }}>
              🔴 Новые ({weakPoints.newlyDetected.length})
            </p>
            {weakPoints.newlyDetected.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>Не появилось</p>
            ) : (
              <ul className="space-y-2">
                {weakPoints.newlyDetected.map((w) => (
                  <li key={w.id} className="text-xs" style={{ color: "var(--ink-2)" }}>{w.title}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Competitor dynamics */}
      {competitors.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-4" style={{ color: "var(--ink)" }}>Динамика конкурентов</h2>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--rule)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--bone-2)", borderBottom: "1px solid var(--rule)" }}>
                  <th className="text-left px-4 py-3 font-semibold" style={{ color: "var(--ink-2)" }}>Конкурент</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--ink-2)" }}>Было</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--ink-2)" }}>Стало</th>
                  <th className="text-right px-4 py-3 font-semibold" style={{ color: "var(--ink-2)" }}>Изменение</th>
                </tr>
              </thead>
              <tbody>
                {competitors
                  .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
                  .map((c, i) => (
                    <tr
                      key={c.name}
                      style={{
                        borderTop: i > 0 ? "1px solid var(--rule)" : undefined,
                        background: "var(--bone)",
                      }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--ink)" }}>{c.name}</td>
                      <td className="px-4 py-3 text-right" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                        {c.prevMentionCount}
                      </td>
                      <td className="px-4 py-3 text-right" style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: "13px", fontWeight: 600 }}>
                        {c.currMentionCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeltaBadge value={c.delta} />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
