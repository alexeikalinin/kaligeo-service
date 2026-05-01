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
  high: { label: "Критично", cls: "bg-red-900/30 border-red-800/50 text-red-400", dot: "bg-red-400" },
  medium: { label: "Важно", cls: "bg-amber-900/20 border-amber-800/40 text-amber-400", dot: "bg-amber-400" },
  low: { label: "Минор", cls: "bg-emerald-900/20 border-emerald-800/40 text-emerald-400", dot: "bg-emerald-400" },
}

export function WeakPointsList({ weakPoints }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  const detected = weakPoints.filter((w) => w.detected)
  const byPriority = [
    ...detected.filter((w) => w.severity === "high"),
    ...detected.filter((w) => w.severity === "medium"),
    ...detected.filter((w) => w.severity === "low"),
  ]

  if (byPriority.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-zinc-300 font-medium">Критических проблем не обнаружено</p>
        <p className="text-zinc-500 text-sm mt-1">Ваш бренд хорошо настроен для AI-поиска</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-500 mb-4">Обнаружено {byPriority.length} проблем</p>
      {byPriority.map((w) => {
        const cfg = SEVERITY_CONFIG[w.severity]
        const isOpen = open === w.id
        return (
          <div
            key={w.id}
            className={`border rounded-xl overflow-hidden ${cfg.cls}`}
          >
            <button
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
              onClick={() => setOpen(isOpen ? null : w.id)}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
              <span className="flex-1 text-sm font-medium text-zinc-200">{w.title}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full bg-zinc-900/40 ${cfg.cls.split(" ")[2]}`}>
                {cfg.label}
              </span>
              <span className="text-zinc-500 text-xs ml-1">{isOpen ? "▲" : "▼"}</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4">
                <p className="text-sm text-zinc-400 leading-relaxed">{w.description}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
