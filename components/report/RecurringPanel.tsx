"use client"

import { useState, useEffect } from "react"
import type { RecurringFrequency } from "@/lib/gates"

interface RecurringPanelProps {
  jobId: string
  token: string
  tier: string
}

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly:    "Еженедельно",
  monthly:   "Ежемесячно",
  quarterly: "Ежеквартально",
}

const TIER_UPGRADES: Record<string, string> = {
  BASIC: "Доступно на тарифе Standard и выше",
}

export function RecurringPanel({ jobId, token, tier }: RecurringPanelProps) {
  const [availableFrequencies, setAvailableFrequencies] = useState<RecurringFrequency[]>([])
  const [currentFrequency, setCurrentFrequency] = useState<RecurringFrequency | null>(null)
  const [nextAuditAt, setNextAuditAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/audit/${jobId}/schedule?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        setAvailableFrequencies(data.availableFrequencies ?? [])
        setCurrentFrequency(data.recurringFrequency ?? null)
        setNextAuditAt(data.followUpScheduledAt ? new Date(data.followUpScheduledAt) : null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [jobId, token])

  const isAvailable = availableFrequencies.length > 0

  async function setFrequency(freq: RecurringFrequency) {
    setSaving(true)
    try {
      const res = await fetch(`/api/audit/${jobId}/schedule?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frequency: freq }),
      })
      const data = await res.json()
      if (data.ok) {
        setCurrentFrequency(freq)
        setNextAuditAt(new Date(data.followUpScheduledAt))
      }
    } finally {
      setSaving(false)
    }
  }

  async function cancelRecurring() {
    setSaving(true)
    try {
      await fetch(`/api/audit/${jobId}/schedule?token=${token}`, { method: "DELETE" })
      setCurrentFrequency(null)
      setNextAuditAt(null)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return null

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
            🔄 Автоматический мониторинг
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
            Повторные аудиты запускаются автоматически и отображаются на вкладке &quot;История&quot;
          </p>
        </div>
        {currentFrequency && (
          <span
            className="shrink-0 text-xs px-2 py-1 rounded"
            style={{ background: "#059669" + "20", color: "#059669", fontFamily: "var(--font-mono)" }}
          >
            Активен
          </span>
        )}
      </div>

      {!isAvailable ? (
        <div
          className="rounded-lg px-3 py-2.5 text-xs"
          style={{ background: "var(--bone-2)", color: "var(--ink-3)", border: "1px solid var(--rule)" }}
        >
          {TIER_UPGRADES[tier] ?? "Недоступно на текущем тарифе"}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Выбор частоты */}
          <div className="flex flex-wrap gap-2">
            {availableFrequencies.map((freq) => (
              <button
                key={freq}
                onClick={() => setFrequency(freq)}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: currentFrequency === freq ? "var(--accent)" : "var(--rule)",
                  color: currentFrequency === freq ? "var(--accent-ink)" : "var(--ink-2)",
                  cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {FREQUENCY_LABELS[freq]}
              </button>
            ))}
            {currentFrequency && (
              <button
                onClick={cancelRecurring}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: "transparent",
                  color: "var(--ink-3)",
                  border: "1px solid var(--rule)",
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                Отключить
              </button>
            )}
          </div>

          {/* Статус */}
          {nextAuditAt && (
            <p className="text-xs" style={{ color: "var(--ink-3)" }}>
              Следующий аудит:{" "}
              <strong style={{ color: "var(--ink-2)" }}>
                {nextAuditAt.toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </strong>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
