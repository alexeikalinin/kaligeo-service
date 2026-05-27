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

function CopyTaskButton({ item }: { item: ActionItem }) {
  const [copied, setCopied] = useState(false)

  function copyAsTask() {
    const text = [
      `## ${item.title}`,
      ``,
      item.description,
      ``,
      `Усилия: ${EFFORT_LABEL[item.effort]} | Эффект: ${IMPACT_LABEL[item.impact]}`,
      item.owner ? `Владелец: ${item.owner}` : null,
      item.expectedResult ? `\nОжидаемый результат: ${item.expectedResult}` : null,
      item.steps?.length ? `\nШаги:\n${item.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}` : null,
    ].filter(Boolean).join("\n")

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copyAsTask}
      className="monotag text-xs transition-colors"
      style={copied ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-ink)" } : { color: "var(--ink-3)", borderColor: "var(--ink-3)" }}
    >
      {copied ? "✓ скопировано" : "скопировать задачу"}
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

// Eisenhower quadrant: effort (low=0,else=1) x impact (high/medium=0,else=1)
const QUADRANTS = [
  {
    id: "quick",
    label: "Быстрые победы",
    star: "★",
    desc: "Низкое усилие · Высокий эффект",
    effort: ["low"],
    impact: ["high", "medium"],
    accent: true,
  },
  {
    id: "strategic",
    label: "Стратегические проекты",
    star: "",
    desc: "Высокое усилие · Высокий эффект",
    effort: ["medium", "high"],
    impact: ["high", "medium"],
    accent: false,
  },
  {
    id: "filler",
    label: "Заполнить паузу",
    star: "",
    desc: "Низкое усилие · Низкий эффект",
    effort: ["low"],
    impact: ["low"],
    accent: false,
  },
  {
    id: "skip",
    label: "Не делать сейчас",
    star: "",
    desc: "Высокое усилие · Низкий эффект",
    effort: ["medium", "high"],
    impact: ["low"],
    accent: false,
  },
]

function EisenhowerMatrix({ plan }: { plan: ActionPlan }) {
  const allItems = [
    ...(plan["30d"] ?? []),
    ...(plan["60d"] ?? []),
    ...(plan["90d"] ?? []),
  ]

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {QUADRANTS.map((q) => {
          const items = allItems.filter(
            (item) => q.effort.includes(item.effort) && q.impact.includes(item.impact)
          )
          return (
            <div
              key={q.id}
              className="rounded-lg p-4"
              style={{
                border: `1px solid ${q.accent ? "var(--accent)" : "var(--rule)"}`,
                background: q.accent ? "rgba(200,242,74,0.07)" : "var(--bone)",
              }}
            >
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-sm font-bold" style={{ color: q.accent ? "var(--accent)" : "var(--ink)" }}>
                  {q.label} {q.star}
                </span>
                <span className="text-xs" style={{ color: "var(--ink-3)" }}>{q.desc}</span>
              </div>
              {items.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>Нет задач</p>
              ) : (
                <div className="space-y-2">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="rounded px-3 py-2 space-y-1"
                      style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
                    >
                      <p className="text-xs font-semibold" style={{ color: "var(--ink)" }}>{item.title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>{item.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex gap-2 text-xs" style={{ color: "var(--ink-3)" }}>
                          <span>Усилие: <span className="font-medium" style={{ color: EFFORT_COLOR[item.effort] }}>{EFFORT_LABEL[item.effort]}</span></span>
                          <span>Эффект: <span className="font-medium" style={{ color: "var(--ink-2)" }}>{IMPACT_LABEL[item.impact]}</span></span>
                        </div>
                        <CopyTaskButton item={item} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

type ViewMode = "list" | "matrix" | "kanban"

type KanbanState = {
  "30d": ActionItem[]
  "60d": ActionItem[]
  "90d": ActionItem[]
}

function KanbanBoard({ plan }: { plan: ActionPlan }) {
  const [columns, setColumns] = useState<KanbanState>({
    "30d": plan["30d"] ?? [],
    "60d": plan["60d"] ?? [],
    "90d": plan["90d"] ?? [],
  })
  const dragging = useState<{ colKey: string; idx: number } | null>(null)
  const [drag, setDrag] = dragging

  function handleDragStart(colKey: string, idx: number) {
    setDrag({ colKey, idx })
  }

  function handleDrop(targetCol: string) {
    if (!drag || drag.colKey === targetCol) { setDrag(null); return }
    const srcKey = drag.colKey as keyof KanbanState
    const dstKey = targetCol as keyof KanbanState
    const item = columns[srcKey][drag.idx]
    setColumns((prev) => ({
      ...prev,
      [srcKey]: prev[srcKey].filter((_, i) => i !== drag.idx),
      [dstKey]: [...prev[dstKey], item],
    }))
    setDrag(null)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(col.key)}
          style={{
            minHeight: "200px",
            padding: "12px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--rule)",
            background: "var(--bone-2)",
          }}
        >
          <div className="flex items-baseline gap-2 mb-3">
            <h3 className="text-sm font-bold" style={{ color: "var(--ink)" }}>{col.label}</h3>
            <span className="text-xs" style={{ color: "var(--ink-3)" }}>{col.sublabel}</span>
            <span
              style={{
                marginLeft: "auto",
                background: "var(--bone)",
                border: "1px solid var(--rule)",
                borderRadius: "3px",
                padding: "0 6px",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-3)",
              }}
            >
              {columns[col.key].length}
            </span>
          </div>
          <div className="space-y-2">
            {columns[col.key].map((item, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => handleDragStart(col.key, i)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--rule)",
                  background: "var(--bone)",
                  cursor: "grab",
                  opacity: drag?.colKey === col.key && drag?.idx === i ? 0.4 : 1,
                }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--ink)" }}>{item.title}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 text-xs" style={{ color: "var(--ink-3)" }}>
                    <span style={{ color: EFFORT_COLOR[item.effort] }}>{EFFORT_LABEL[item.effort]}</span>
                    <span>·</span>
                    <span>{IMPACT_LABEL[item.impact]}</span>
                  </div>
                  <CopyTaskButton item={item} />
                </div>
              </div>
            ))}
            {columns[col.key].length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: "var(--ink-3)" }}>
                Перетащите сюда задачу
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function ActionPlanTimeline({ plan }: Props) {
  const isAdvanced = !!plan.strategy
  const [view, setView] = useState<ViewMode>("list")

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

      {/* View toggle */}
      <div className="flex items-center gap-2 mb-6">
        {(["list", "kanban", "matrix"] as ViewMode[]).map((mode) => (
          <button
            key={mode}
            onClick={() => setView(mode)}
            className="monotag text-xs transition-colors"
            style={
              view === mode
                ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-ink)" }
                : { color: "var(--ink-3)", borderColor: "var(--rule)" }
            }
          >
            {mode === "list" ? "Список" : mode === "kanban" ? "Доска" : "Матрица"}
          </button>
        ))}
      </div>

      {/* Matrix view */}
      {view === "matrix" ? (
        <EisenhowerMatrix plan={plan} />
      ) : view === "kanban" ? (
        <KanbanBoard plan={plan} />
      ) : (
        /* List view — 30/60/90 */
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
      )}

      {/* Контент-план — только Advanced */}
      {plan.contentCalendar && plan.contentCalendar.length > 0 && (
        <ContentCalendarBlock calendar={plan.contentCalendar} />
      )}
    </div>
  )
}
