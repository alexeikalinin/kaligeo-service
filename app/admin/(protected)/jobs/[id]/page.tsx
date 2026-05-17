"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"

function RestartButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function restart() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/restart`, { method: "POST" })
      if (res.ok) setDone(true)
    } finally {
      setLoading(false)
    }
  }

  if (done) return <span className="text-emerald-400 text-sm">✓ Перезапущен</span>

  return (
    <button
      onClick={restart}
      disabled={loading}
      className="px-5 py-3 bg-red-900/40 border border-red-800 text-red-300 rounded-xl text-sm hover:bg-red-900/60 transition-colors disabled:opacity-50"
    >
      {loading ? "Запускаем..." : "↺ Перезапустить"}
    </button>
  )
}

type JobStatus =
  | "PENDING"
  | "GENERATING_QUERIES"
  | "EXECUTING_QUERIES"
  | "ANALYZING"
  | "GENERATING_REPORT"
  | "DELIVERING"
  | "COMPLETED"
  | "FAILED"

interface JobData {
  status: JobStatus
  tier: string
  companyName: string
  niche: string
  clientEmail: string
  websiteUrl: string
  errorMessage?: string
  reportUrl?: string
  pdfUrl?: string
  createdAt?: string
  completedAt?: string
}

const STEPS: { key: JobStatus; label: string; description: string }[] = [
  { key: "PENDING", label: "Подготовка", description: "Инициализация задания" },
  { key: "GENERATING_QUERIES", label: "Генерация запросов", description: "GPT создаёт список запросов по нише" },
  { key: "EXECUTING_QUERIES", label: "Опрос AI-платформ", description: "Параллельный опрос 7 платформ" },
  { key: "ANALYZING", label: "Анализ", description: "Подсчёт scores и матрицы конкурентов" },
  { key: "GENERATING_REPORT", label: "Генерация отчёта", description: "Claude создаёт план роста и PDF" },
  { key: "DELIVERING", label: "Отправка", description: "Письмо с отчётом на email" },
  { key: "COMPLETED", label: "Готово", description: "Аудит завершён" },
]

const STATUS_ORDER = STEPS.map((s) => s.key)

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<JobData | null>(null)

  useEffect(() => {
    if (!id) return

    const poll = async () => {
      const res = await fetch(`/api/audit/${id}/status`)
      if (!res.ok) return
      const json: JobData = await res.json()
      setData(json)
      if (json.status === "COMPLETED" || json.status === "FAILED") {
        clearInterval(interval)
      }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [id])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
      </div>
    )
  }

  const currentStep = STATUS_ORDER.indexOf(data.status)
  const isActive = data.status !== "COMPLETED" && data.status !== "FAILED"

  return (
    <div className="max-w-2xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{data.companyName}</h1>
          <p className="text-zinc-500 text-sm mt-1">{data.websiteUrl}</p>
        </div>
        <div className="text-right text-xs text-zinc-600">
          <p>{data.tier}</p>
          <p>{data.clientEmail}</p>
        </div>
      </div>

      <div className="bg-zinc-800 rounded-2xl p-6 mb-6 space-y-3">
        {STEPS.map((step, i) => {
          const isDone = i < currentStep || data.status === "COMPLETED"
          const isCurrent = i === currentStep && isActive
          const isPending = i > currentStep

          return (
            <div key={step.key} className="flex items-start gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    data.status === "COMPLETED" || isDone
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                        ? "bg-zinc-600 text-zinc-200"
                        : data.status === "FAILED" && isCurrent
                          ? "bg-red-500 text-white"
                          : "bg-zinc-700 text-zinc-600"
                  }`}
                >
                  {data.status === "COMPLETED" || isDone ? "✓" : isCurrent ? "●" : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-px h-5 mt-1 ${isDone ? "bg-emerald-500/40" : "bg-zinc-700"}`} />
                )}
              </div>
              <div className={`pb-1 ${isPending ? "opacity-40" : ""}`}>
                <p className={`text-sm font-medium ${isCurrent ? "text-zinc-100" : isDone ? "text-zinc-300" : "text-zinc-500"}`}>
                  {step.label}
                  {isCurrent && (
                    <span className="ml-2 inline-flex gap-0.5">
                      <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-600">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {data.status === "FAILED" && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4">
          <p className="text-red-300 text-sm mb-3">{data.errorMessage ?? "Произошла ошибка"}</p>
          <RestartButton jobId={id} />
        </div>
      )}

      {data.status === "COMPLETED" && data.reportUrl && (
        <div className="flex gap-3">
          <Link
            href={data.reportUrl}
            className="flex-1 text-center py-3 bg-zinc-100 text-zinc-900 rounded-xl font-semibold text-sm hover:bg-white transition-colors"
          >
            Открыть отчёт →
          </Link>
          {data.pdfUrl && (
            <a
              href={data.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-zinc-700 text-zinc-200 rounded-xl text-sm hover:bg-zinc-600 transition-colors"
            >
              PDF
            </a>
          )}
        </div>
      )}
    </div>
  )
}
