"use client"

import { useState } from "react"

interface WeakPoint {
  id: string
  title: string
  description: string
  severity: "low" | "medium" | "high"
  detected: boolean
}

interface Props {
  weakPoints: WeakPoint[]
}

const SEVERITY_CONFIG = {
  high: { label: "Критично", dotColor: "#ef4444", textColor: "#ef4444" },
  medium: { label: "Важно", dotColor: "#f59e0b", textColor: "#f59e0b" },
  low: { label: "Минор", dotColor: "var(--accent)", textColor: "var(--ink-2)" },
}

export function WeakPointsList({ weakPoints }: Props) {
  const detected = weakPoints.filter((w) => w.detected)
  const firstHighId = detected.find((w) => w.severity === "high")?.id ?? null
  const [open, setOpen] = useState<string | null>(firstHighId)
  const byPriority = [
    ...detected.filter((w) => w.severity === "high"),
    ...detected.filter((w) => w.severity === "medium"),
    ...detected.filter((w) => w.severity === "low"),
  ]

  if (byPriority.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="font-medium mb-1" style={{ color: "var(--ink)" }}>
          Критических проблем не обнаружено
        </p>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          Ваш бренд хорошо настроен для AI-поиска
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm mb-4" style={{ color: "var(--ink-3)" }}>
        Обнаружено {byPriority.length} проблем
      </p>
      {byPriority.map((w) => {
        const cfg = SEVERITY_CONFIG[w.severity]
        const isOpen = open === w.id
        return (
          <div
            key={w.id}
            className="rounded-lg overflow-hidden"
            style={{ border: "1px solid var(--rule)" }}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bone-2)] transition-colors"
              onClick={() => setOpen(isOpen ? null : w.id)}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: cfg.dotColor }}
              />
              <span className="flex-1 text-sm font-medium" style={{ color: "var(--ink)" }}>
                {w.title}
              </span>
              <span className="monotag shrink-0" style={{ color: cfg.textColor, borderColor: cfg.dotColor }}>
                {cfg.label}
              </span>
              <span className="text-xs ml-1" style={{ color: "var(--ink-3)" }}>
                {isOpen ? "▲" : "▼"}
              </span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 border-t" style={{ borderColor: "var(--rule)" }}>
                <p
                  className="text-sm leading-relaxed mt-3"
                  style={{ color: "var(--ink-2)" }}
                >
                  {w.description}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
