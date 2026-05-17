interface NicheIntelligenceProps {
  niche: string
  overallScore: number
  totalQueries: number
  totalMentions: number
  topCompetitorMentions: number
  topCompetitorName: string
  avgOrderValue?: number
  tier: string
}

const TIER_ORDER: Record<string, number> = { BASIC: 0, STANDARD: 1, ADVANCED: 2 }

function fmt(n: number): string {
  return n.toLocaleString("ru-RU")
}

export function NicheIntelligence({
  niche,
  overallScore,
  totalQueries,
  totalMentions,
  topCompetitorMentions,
  topCompetitorName,
  avgOrderValue,
  tier,
}: NicheIntelligenceProps) {
  const isStandardPlus = (TIER_ORDER[tier] ?? 0) >= TIER_ORDER["STANDARD"]

  const monthlyAIQueries = totalQueries * 80
  const yourCaptureRate = totalQueries > 0 ? (totalMentions / totalQueries) * 100 : 0
  const leaderCaptureRate = totalQueries > 0 ? (topCompetitorMentions / totalQueries) * 100 : 0
  const missedMentionsPerMonth = Math.round(
    monthlyAIQueries * (leaderCaptureRate - yourCaptureRate) / 100
  )
  const missedLeadsEstimate = Math.round(missedMentionsPerMonth * 0.03)
  const missedRevenue = avgOrderValue != null ? missedLeadsEstimate * avgOrderValue : null

  const cardStyle: React.CSSProperties = {
    background: "var(--bone-2)",
    border: "1px solid var(--rule)",
    borderRadius: "var(--radius-lg)",
    padding: "20px 24px",
  }

  const barTotal = yourCaptureRate + leaderCaptureRate
  const yourBarPct = barTotal > 0 ? (yourCaptureRate / barTotal) * 100 : 0
  const leaderBarPct = barTotal > 0 ? (leaderCaptureRate / barTotal) * 100 : 0

  return (
    <section>
      <p className="t-eyebrow mb-1">Потенциал ниши</p>
      <h2
        className="text-lg font-bold mb-5"
        style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
      >
        Что теряет ваш бизнес прямо сейчас
      </h2>

      <div
        className="grid gap-4 mb-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        {/* Card 1: Monthly AI queries */}
        <div style={cardStyle}>
          <p className="t-eyebrow mb-3">Запросов в нише в месяц</p>
          <p
            className="text-4xl font-bold leading-none mb-2"
            style={{ fontFamily: "var(--font-mono)", color: "var(--ink)" }}
          >
            {fmt(monthlyAIQueries)}
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--ink-3)" }}>
            Приблизительная оценка активности в AI-поиске по вашей нише
          </p>
          <span className="monotag" style={{ color: "var(--ink-3)" }}>оценка</span>
        </div>

        {/* Card 2: Capture rate comparison */}
        <div style={cardStyle}>
          <p className="t-eyebrow mb-3">Захват упоминаний</p>
          <div className="flex items-end gap-4 mb-3">
            <div>
              <p
                className="text-3xl font-bold leading-none"
                style={{ fontFamily: "var(--font-mono)", color: "#ef4444" }}
              >
                {yourCaptureRate.toFixed(0)}%
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>Вы</p>
            </div>
            <div>
              <p
                className="text-3xl font-bold leading-none"
                style={{ fontFamily: "var(--font-mono)", color: "#16a34a" }}
              >
                {leaderCaptureRate.toFixed(0)}%
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>{topCompetitorName}</p>
            </div>
          </div>
          {/* Comparison bar */}
          <div
            className="h-2 rounded-full overflow-hidden flex"
            style={{ background: "var(--rule)" }}
          >
            <div
              className="h-full"
              style={{ width: `${yourBarPct}%`, background: "#ef4444" }}
            />
            <div
              className="h-full"
              style={{ width: `${leaderBarPct}%`, background: "#16a34a" }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--ink-3)" }}>
            vs. {topCompetitorName} — лидер по упоминаниям
          </p>
        </div>

        {/* Card 3: Missed mentions */}
        <div style={cardStyle}>
          <p className="t-eyebrow mb-3">Упускаете в месяц</p>
          {isStandardPlus ? (
            <>
              <p
                className="text-4xl font-bold leading-none mb-2"
                style={{ fontFamily: "var(--font-mono)", color: "#ef4444" }}
              >
                {fmt(missedMentionsPerMonth)}
              </p>
              <p className="text-xs mb-3" style={{ color: "var(--ink-3)" }}>
                упоминаний проходят мимо вас каждый месяц
              </p>
              {missedRevenue != null && (
                <p className="text-xs" style={{ color: "var(--ink-2)" }}>
                  При среднем чеке {fmt(avgOrderValue!)} руб —{" "}
                  <strong style={{ color: "var(--ink)" }}>~{fmt(missedRevenue)} руб</strong>{" "}
                  потенциальной выручки
                </p>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <p
                className="text-4xl font-bold leading-none blur-[6px] select-none"
                style={{ fontFamily: "var(--font-mono)", color: "#ef4444" }}
              >
                ????
              </p>
              <span className="monotag" style={{ borderColor: "var(--ink)", color: "var(--ink)" }}>
                Standard+
              </span>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                Доступно в Standard и Advanced тарифах
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Insight block */}
      <div
        className="rounded-xl px-5 py-4"
        style={{ background: "var(--ink)", color: "var(--bone)" }}
      >
        <p className="text-sm leading-relaxed">
          Если вы достигнете уровня{" "}
          <strong style={{ color: "var(--accent)" }}>{topCompetitorName}</strong> к концу квартала,
          вы будете появляться в{" "}
          <strong style={{ color: "var(--accent)" }}>~{fmt(missedMentionsPerMonth)}</strong>{" "}
          дополнительных AI-ответах ежемесячно.
          {missedLeadsEstimate > 0 && (
            <> Это ~{fmt(missedLeadsEstimate)} потенциальных лидов при конверсии 3%.</>
          )}
        </p>
        <p
          className="text-xs mt-3"
          style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}
        >
          * Оценки основаны на экстраполяции данных аудита. Реальные объёмы зависят от ниши и
          сезонности.
        </p>
      </div>
    </section>
  )
}
