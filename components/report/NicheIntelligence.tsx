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

export function NicheIntelligence({ totalQueries, totalMentions, topCompetitorMentions, topCompetitorName }: NicheIntelligenceProps) {
  if (!totalQueries || !topCompetitorMentions) return null
  const brandRate = Math.round(totalMentions / totalQueries * 100)
  const competitorRate = Math.round(topCompetitorMentions / totalQueries * 100)
  return <section>
    <p className="t-eyebrow mb-1">Упоминания в проверенной выборке</p>
    <h2 className="text-lg font-bold mb-4" style={{ color: "var(--ink)" }}>Ваш бренд и конкурент</h2>
    <div className="grid gap-4 sm:grid-cols-3">
      {[["Ответов проверено", totalQueries], ["Упоминания вашего бренда", `${totalMentions} (${brandRate}%)`], [topCompetitorName, `${topCompetitorMentions} (${competitorRate}%)`]].map(([label, value]) => <div key={String(label)} className="rounded-xl p-5" style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}>
        <p className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>{label}</p>
        <p className="text-2xl font-bold" style={{ color: "var(--ink)" }}>{value}</p>
      </div>)}
    </div>
    <p className="text-xs mt-3" style={{ color: "var(--ink-3)" }}>Доли рассчитаны по ответам этого аудита. Они не измеряют рыночный спрос, число лидов или выручку.</p>
  </section>
}
