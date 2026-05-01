"use client"

interface ActionItem {
  title: string
  description: string
  effort: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
}

interface ActionPlan {
  "30d": ActionItem[]
  "60d": ActionItem[]
  "90d": ActionItem[]
}

interface Props {
  plan: ActionPlan
}

const EFFORT_COLORS: Record<string, string> = {
  low: "text-emerald-400",
  medium: "text-amber-400",
  high: "text-red-400",
}
const IMPACT_COLORS: Record<string, string> = {
  low: "text-zinc-400",
  medium: "text-blue-400",
  high: "text-purple-400",
}

function ActionCard({ item }: { item: ActionItem }) {
  return (
    <div className="bg-zinc-800 rounded-xl p-4 space-y-2">
      <p className="text-sm font-semibold text-zinc-200">{item.title}</p>
      <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
      <div className="flex gap-3 text-xs">
        <span>
          Усилия:{" "}
          <span className={`font-medium ${EFFORT_COLORS[item.effort]}`}>
            {item.effort === "low" ? "низкие" : item.effort === "medium" ? "средние" : "высокие"}
          </span>
        </span>
        <span>
          Эффект:{" "}
          <span className={`font-medium ${IMPACT_COLORS[item.impact]}`}>
            {item.impact === "low" ? "низкий" : item.impact === "medium" ? "средний" : "высокий"}
          </span>
        </span>
      </div>
    </div>
  )
}

const COLUMNS = [
  { key: "30d" as const, label: "30 дней", sublabel: "Быстрые победы" },
  { key: "60d" as const, label: "60 дней", sublabel: "Средний срок" },
  { key: "90d" as const, label: "90 дней", sublabel: "Стратегия" },
]

export function ActionPlanTimeline({ plan }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {COLUMNS.map((col) => (
        <div key={col.key}>
          <div className="mb-4">
            <h3 className="text-base font-bold text-zinc-100">{col.label}</h3>
            <p className="text-xs text-zinc-500">{col.sublabel}</p>
          </div>
          <div className="space-y-3">
            {(plan[col.key] ?? []).map((item, i) => (
              <ActionCard key={i} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
