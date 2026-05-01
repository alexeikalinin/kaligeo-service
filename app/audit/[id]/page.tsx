"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"

type JobStatus =
  | "PENDING"
  | "GENERATING_QUERIES"
  | "EXECUTING_QUERIES"
  | "ANALYZING"
  | "GENERATING_REPORT"
  | "DELIVERING"
  | "COMPLETED"
  | "FAILED"

interface StatusResponse {
  status: JobStatus
  companyName: string
  errorMessage?: string
  reportUrl?: string
  completedAt?: string
}

const STEPS: { key: JobStatus; label: string }[] = [
  { key: "PENDING", label: "Подготовка" },
  { key: "GENERATING_QUERIES", label: "Генерация запросов" },
  { key: "EXECUTING_QUERIES", label: "Опрос AI-платформ" },
  { key: "ANALYZING", label: "Анализ результатов" },
  { key: "GENERATING_REPORT", label: "Генерация отчёта" },
  { key: "DELIVERING", label: "Отправка на email" },
  { key: "COMPLETED", label: "Готово" },
]

const STATUS_ORDER = STEPS.map((s) => s.key)

export default function AuditStatusPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<StatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/audit/${id}/status`)
        if (!res.ok) {
          setError("Аудит не найден")
          return
        }
        const json: StatusResponse = await res.json()
        setData(json)

        if (json.status === "COMPLETED" && json.reportUrl) {
          router.push(json.reportUrl)
          return
        }
        if (json.status === "FAILED") return
      } catch {
        setError("Ошибка загрузки статуса")
      }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [id, router])

  const currentStep = data ? STATUS_ORDER.indexOf(data.status) : 0

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            {data?.companyName ?? "KaliGEO"}
          </h1>
          <p className="text-zinc-400 text-sm">AI-аудит в процессе...</p>
        </div>

        {error ? (
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-red-300 text-sm text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-3">
            {STEPS.map((step, i) => {
              const isDone = i < currentStep
              const isActive = i === currentStep && data?.status !== "COMPLETED"
              const isCompleted = data?.status === "COMPLETED"

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCompleted || isDone
                      ? "text-zinc-300"
                      : isActive
                        ? "text-zinc-100 bg-zinc-800"
                        : "text-zinc-600"
                  }`}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">
                    {isCompleted || isDone ? (
                      <span className="text-emerald-400">✓</span>
                    ) : isActive ? (
                      <span className="w-3 h-3 rounded-full bg-zinc-400 animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-zinc-700" />
                    )}
                  </span>
                  <span className="text-sm">{step.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {data?.status === "FAILED" && (
          <div className="mt-6 bg-red-900/30 border border-red-800 rounded-xl p-4">
            <p className="text-red-300 text-sm mb-3">
              {data.errorMessage ?? "Произошла ошибка при выполнении аудита"}
            </p>
            <button
              onClick={() => router.push("/chat")}
              className="w-full py-2 bg-zinc-700 text-zinc-100 rounded-lg text-sm hover:bg-zinc-600 transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
