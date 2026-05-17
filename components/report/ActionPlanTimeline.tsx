"use client"

import { useState } from "react"

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="monotag text-xs transition-colors"
      style={copied ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-ink)" } : { color: "var(--ink-3)", borderColor: "var(--ink-3)" }}
    >
      {copied ? "✓ скопировано" : "копировать"}
    </button>
  )
}

interface ActionItem {
  title: string
  description: string
  effort: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
  // Advanced-only
  steps?: string[]
  expectedResult?: string
  tools?: string[]
  owner?: string
}

interface QuickWin {
  action: string
  howTo: string
  timeEstimate: string
  impact: string
  code?: string
}

interface ContentTask {
  week: number
  theme: string
  tasks: string[]
}

interface ActionPlan {
  "30d": ActionItem[]
  "60d": ActionItem[]
  "90d": ActionItem[]
  // Advanced-only
  strategy?: string
  quickWins?: QuickWin[]
  contentCalendar?: ContentTask[]
}

interface Props {
  plan: ActionPlan
}

const EFFORT_COLOR: Record<string, string> = {
  low: "var(--accent)",
  medium: "#f59e0b",
  high: "#ef4444",
}
const EFFORT_LABEL: Record<string, string>  = { low: "низкие",  medium: "средние",  high: "высокие" }
const IMPACT_LABEL: Record<string, string>  = { low: "низкий",  medium: "средний",  high: "высокий" }
const OWNER_LABEL:  Record<string, string>  = {
  "разработчик": "👨‍💻",
  "маркетолог": "📣",
  "контент-менеджер": "✍️",
  "руководитель": "🎯",
}

function ActionCard({ item }: { item: ActionItem }) {
  const isRich = !!item.steps?.length
  return (
    <div
      className="rounded-lg p-4 space-y-3"
      style={{ border: "1px solid var(--rule)", background: "var(--bone)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          {item.title}
        </p>
        {item.owner && (
          <span className="text-xs shrink-0" title={item.owner}>
            {OWNER_LABEL[item.owner] ?? "👤"} {item.owner}
          </span>
        )}
      </div>

      <p className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
        {item.description}
      </p>

      {/* Конкретные шаги — только Advanced */}
      {isRich && (
        <ol className="space-y-1">
          {item.steps!.map((step, i) => (
            <li key={i} className="flex gap-2 text-xs" style={{ color: "var(--ink-2)" }}>
              <span
                className="shrink-0 font-mono font-bold w-4"
                style={{ color: "var(--accent)" }}
              >
                {i + 1}.
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      )}

      {/* Ожидаемый результат */}
      {item.expectedResult && (
        <div
          className="rounded px-3 py-2 text-xs"
          style={{ background: "var(--bone-2)", color: "var(--ink-2)" }}
        >
          <span style={{ color: "var(--accent)", fontWeight: 600 }}>→ </span>
          {item.expectedResult}
        </div>
      )}

      {/* Инструменты */}
      {item.tools && item.tools.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {item.tools.map((t) => (
            <span key={t} className="monotag text-xs">{t}</span>
          ))}
        </div>
      )}

      <div className="flex gap-3 text-xs" style={{ color: "var(--ink-3)" }}>
        <span>
          Усилия:{" "}
          <span className="font-medium" style={{ color: EFFORT_COLOR[item.effort] }}>
            {EFFORT_LABEL[item.effort]}
          </span>
        </span>
        <span>
          Эффект:{" "}
          <span className="font-medium" style={{ color: "var(--ink-2)" }}>
            {IMPACT_LABEL[item.impact]}
          </span>
        </span>
      </div>
    </div>
  )
}

function QuickWinsBlock({ wins }: { wins: QuickWin[] }) {
  return (
    <div
      className="rounded-lg p-5 mb-8"
      style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
    >
      <p className="t-eyebrow mb-4">⚡ Быстрые победы — сделай на этой неделе</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {wins.map((win, i) => (
          <div key={i} className="space-y-2">
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              {win.action}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {win.howTo}
            </p>
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--ink-3)" }}>
              <span>⏱ {win.timeEstimate}</span>
            </div>
            <div
              className="rounded px-2 py-1.5 text-xs"
              style={{ background: "var(--bone)", color: "var(--ink-2)", border: "1px solid var(--rule)" }}
            >
              <span style={{ color: "var(--accent)", fontWeight: 600 }}>→ </span>
              {win.impact}
            </div>
            {win.code && (
              <div style={{ background: "var(--ink)", borderRadius: "6px", overflow: "hidden" }}>
                <div className="flex items-center justify-between px-3 py-1.5">
                  <span className="text-xs" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>код</span>
                  <CopyCodeButton code={win.code} />
                </div>
                <pre style={{ fontFamily: "var(--font-mono)", color: "#a5f3a0", margin: 0, padding: "0 12px 12px", fontSize: "11px", lineHeight: 1.5, maxHeight: "200px", overflowY: "auto", overflowX: "auto" }}>
                  {win.code}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ContentCalendarBlock({ calendar }: { calendar: ContentTask[] }) {
  return (
    <div className="mt-10">
      <h3 className="text-base font-bold mb-4" style={{ color: "var(--ink)" }}>
        Контент-план
      </h3>
      <div className="space-y-2">
        {calendar.map((week) => (
          <div
            key={week.week}
            className="flex gap-4 rounded-lg px-4 py-3"
            style={{ border: "1px solid var(--rule)" }}
          >
            <span
              className="shrink-0 font-mono text-xs font-bold w-16 pt-0.5"
              style={{ color: "var(--ink-3)" }}
            >
              Нед. {week.week}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1" style={{ color: "var(--ink)" }}>
                {week.theme}
              </p>
              <ul className="space-y-0.5">
                {week.tasks.map((task, i) => (
                  <li key={i} className="text-xs" style={{ color: "var(--ink-3)" }}>
                    · {task}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const COLUMNS = [
  { key: "30d" as const, label: "30 дней",  sublabel: "Быстрые победы" },
  { key: "60d" as const, label: "60 дней",  sublabel: "Контент и авторитет" },
  { key: "90d" as const, label: "90 дней",  sublabel: "Стратегия" },
]

export function ActionPlanTimeline({ plan }: Props) {
  const isAdvanced = !!plan.strategy

  return (
    <div>
      {/* Общая стратегия — только Advanced */}
      {plan.strategy && (
        <div
          className="rounded-lg p-5 mb-8"
          style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
        >
          <p className="t-eyebrow mb-2">Стратегия</p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)" }}>
            {plan.strategy}
          </p>
        </div>
      )}

      {/* Быстрые победы — только Advanced */}
      {plan.quickWins && plan.quickWins.length > 0 && (
        <QuickWinsBlock wins={plan.quickWins} />
      )}

      {/* 30/60/90 */}
      <div className={`grid grid-cols-1 gap-6 ${isAdvanced ? "" : "md:grid-cols-3"}`}>
        {isAdvanced ? (
          // Advanced: вертикальный список с раскрытыми шагами
          COLUMNS.map((col) => (
            <div key={col.key}>
              <div className="flex items-baseline gap-3 mb-4">
                <h3 className="text-base font-bold" style={{ color: "var(--ink)" }}>
                  {col.label}
                </h3>
                <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                  {col.sublabel}
                </span>
              </div>
              <div className="space-y-3">
                {(plan[col.key] ?? []).map((item, i) => (
                  <ActionCard key={i} item={item} />
                ))}
              </div>
            </div>
          ))
        ) : (
          // Standard: компактные карточки в 3 колонки
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 col-span-full">
            {COLUMNS.map((col) => (
              <div key={col.key}>
                <div className="mb-4">
                  <h3 className="text-base font-bold" style={{ color: "var(--ink)" }}>
                    {col.label}
                  </h3>
                  <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                    {col.sublabel}
                  </p>
                </div>
                <div className="space-y-3">
                  {(plan[col.key] ?? []).map((item, i) => (
                    <ActionCard key={i} item={item} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Контент-план — только Advanced */}
      {plan.contentCalendar && plan.contentCalendar.length > 0 && (
        <ContentCalendarBlock calendar={plan.contentCalendar} />
      )}
    </div>
  )
}
