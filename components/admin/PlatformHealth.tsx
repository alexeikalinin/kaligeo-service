"use client"

import { useState } from "react"
import type { PlatformHealthResult } from "@/app/api/admin/platform-health/route"

const STATUS_ICON: Record<string, string> = {
  ok: "●",
  error: "●",
  unconfigured: "○",
}

const STATUS_COLOR: Record<string, string> = {
  ok: "#22c55e",
  error: "#ef4444",
  unconfigured: "#52525b",
}

const STATUS_LABEL: Record<string, string> = {
  ok: "Работает",
  error: "Ошибка",
  unconfigured: "Не настроен",
}

function balanceColor(raw?: number): string {
  if (raw === undefined) return "#e4e4e7"
  if (raw <= 1) return "#ef4444"
  if (raw <= 5) return "#f59e0b"
  return "#22c55e"
}

export function PlatformHealth() {
  const [results, setResults] = useState<PlatformHealthResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [checkedAt, setCheckedAt] = useState<string | null>(null)

  async function runCheck() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/platform-health")
      const data: PlatformHealthResult[] = await res.json()
      setResults(data)
      setCheckedAt(data[0]?.checkedAt ?? new Date().toISOString())
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  const okCount = results?.filter((r) => r.status === "ok").length ?? 0
  const errCount = results?.filter((r) => r.status === "error").length ?? 0

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-zinc-200">Статус API-ключей</p>
          {checkedAt && (
            <p className="text-xs text-zinc-600 mt-0.5">
              Проверено: {new Date(checkedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
              {errCount > 0 && (
                <span className="ml-2 text-red-400 font-medium">⚠ {errCount} с ошибкой</span>
              )}
              {results && errCount === 0 && (
                <span className="ml-2 text-emerald-400">✓ Все {okCount} работают</span>
              )}
            </p>
          )}
        </div>
        <button
          onClick={runCheck}
          disabled={loading}
          className="px-4 py-2 text-sm bg-zinc-800 border border-zinc-700 text-zinc-200 rounded-lg hover:bg-zinc-700 hover:border-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 border-2 border-zinc-500 border-t-zinc-200 rounded-full animate-spin" />
              Проверяем...
            </span>
          ) : "Проверить сейчас"}
        </button>
      </div>

      {/* Not yet checked */}
      {!results && !loading && (
        <p className="text-sm text-zinc-600 text-center py-6">
          Нажмите «Проверить сейчас» — сделаем ping каждой платформы
        </p>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-12 bg-zinc-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <div className="space-y-2">
          {results.map((r) => (
            <div
              key={r.key}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors"
              style={{
                borderColor: r.status === "error" ? "rgba(239,68,68,0.2)" : r.status === "ok" ? "rgba(34,197,94,0.1)" : "rgba(63,63,70,0.5)",
                background: r.status === "error" ? "rgba(239,68,68,0.04)" : r.status === "ok" ? "rgba(34,197,94,0.03)" : "transparent",
              }}
            >
              {/* Status dot */}
              <span style={{ color: STATUS_COLOR[r.status], fontSize: "10px", flexShrink: 0 }}>
                {STATUS_ICON[r.status]}
              </span>

              {/* Name */}
              <span className="text-sm font-medium text-zinc-200 w-24 shrink-0">{r.name}</span>

              {/* Status label */}
              <span className="text-xs shrink-0" style={{ color: STATUS_COLOR[r.status] }}>
                {STATUS_LABEL[r.status]}
              </span>

              {/* Error message */}
              {r.error && (
                <span className="text-xs text-red-400/70 truncate flex-1" title={r.error}>
                  {r.error.slice(0, 60)}
                </span>
              )}

              {/* Balance */}
              {r.hasBalanceApi && r.status === "ok" && (
                <span
                  className="text-xs font-mono font-semibold ml-auto shrink-0"
                  style={{ color: balanceColor(r.balanceRaw) }}
                >
                  {r.balance ?? "—"}
                  {r.balanceRaw !== undefined && r.balanceRaw <= 1 && (
                    <span className="ml-1 text-red-400">⚠ Пополни!</span>
                  )}
                </span>
              )}

              {/* No balance API — link to dashboard */}
              {!r.hasBalanceApi && r.status === "ok" && (
                <a
                  href={r.dashboardUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors ml-auto shrink-0"
                >
                  Баланс в кабинете ↗
                </a>
              )}

              {/* Unconfigured — note */}
              {r.status === "unconfigured" && (
                <span className="text-xs text-zinc-700 ml-auto">ключ не задан в env</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tip */}
      {results && (
        <p className="text-xs text-zinc-700 mt-4">
          Ping не тратит токены — только проверяет валидность ключа. DeepSeek показывает реальный баланс.
        </p>
      )}
    </div>
  )
}
