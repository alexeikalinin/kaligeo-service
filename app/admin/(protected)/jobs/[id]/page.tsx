"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

function DeleteButton({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    if (!confirm("Удалить эту заявку? Действие необратимо.")) return
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}`, { method: "DELETE" })
      if (res.ok) router.push("/admin")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="px-4 py-2 text-xs text-red-500 border border-red-900/40 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors disabled:opacity-50"
    >
      {loading ? "Удаление..." : "Удалить заявку"}
    </button>
  )
}

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

  if (done) return <span className="text-emerald-700 text-sm">✓ Перезапущен</span>

  return (
    <button
      onClick={restart}
      disabled={loading}
      className="px-5 py-3 bg-red-50 border border-red-800 text-red-700 rounded-xl text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
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
  { key: "GENERATING_QUERIES", label: "Генерация запросов", description: "Подготовка и согласование вопросов по карте бизнеса" },
  { key: "EXECUTING_QUERIES", label: "Опрос AI-платформ", description: "Параллельный опрос платформ по тарифу" },
  { key: "ANALYZING", label: "Анализ", description: "Подсчёт scores и матрицы конкурентов" },
  { key: "GENERATING_REPORT", label: "Генерация отчёта", description: "Подготовка рекомендаций и отчёта" },
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
      const res = await fetch(`/api/admin/jobs/${id}`)
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
        <div className="w-8 h-8 border-2 border-[#E5E5E1] border-t-[#E5E5E1] rounded-full animate-spin" />
      </div>
    )
  }

  const currentStep = STATUS_ORDER.indexOf(data.status)
  const isActive = data.status !== "COMPLETED" && data.status !== "FAILED"

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/admin" className="text-sm text-[#6A6D75] hover:text-[#0F1115] transition-colors">
          ← Заявки
        </Link>
        <DeleteButton jobId={id} />
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{data.companyName}</h1>
          <p className="text-[#6A6D75] text-sm mt-1">{data.websiteUrl}</p>
        </div>
        <div className="text-right text-xs text-[#6A6D75]">
          <p>{data.tier}</p>
          <p>{data.clientEmail}</p>
        </div>
      </div>

      <div className="bg-[#F2F1EB] rounded-2xl p-6 mb-6 space-y-3">
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
                      ? "bg-emerald-500 text-[#0F1115]"
                      : isCurrent
                        ? "bg-[#F2F1EB] text-[#0F1115]"
                        : data.status === "FAILED" && isCurrent
                          ? "bg-red-500 text-[#0F1115]"
                          : "bg-[#F2F1EB] text-[#6A6D75]"
                  }`}
                >
                  {data.status === "COMPLETED" || isDone ? "✓" : isCurrent ? "●" : i + 1}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-px h-5 mt-1 ${isDone ? "bg-emerald-500/40" : "bg-[#F2F1EB]"}`} />
                )}
              </div>
              <div className={`pb-1 ${isPending ? "opacity-40" : ""}`}>
                <p className={`text-sm font-medium ${isCurrent ? "text-[#0F1115]" : isDone ? "text-[#0F1115]" : "text-[#6A6D75]"}`}>
                  {step.label}
                  {isCurrent && (
                    <span className="ml-2 inline-flex gap-0.5">
                      <span className="w-1 h-1 bg-[#F2F1EB] rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1 h-1 bg-[#F2F1EB] rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1 h-1 bg-[#F2F1EB] rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  )}
                </p>
                <p className="text-xs text-[#6A6D75]">{step.description}</p>
              </div>
            </div>
          )
        })}
      </div>

      {data.status === "FAILED" && (
        <div className="bg-red-50 border border-red-800 rounded-xl p-4 mb-4">
          <p className="text-red-700 text-sm mb-3">{data.errorMessage ?? "Произошла ошибка"}</p>
          <RestartButton jobId={id} />
        </div>
      )}

      {data.status === "COMPLETED" && data.reportUrl && (
        <div className="flex gap-3">
          <Link
            href={data.reportUrl}
            className="flex-1 text-center py-3 bg-[#F2F1EB] text-[#0F1115] rounded-xl font-semibold text-sm hover:bg-white transition-colors"
          >
            Открыть отчёт →
          </Link>
          {data.pdfUrl && (
            <a
              href={data.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 bg-[#F2F1EB] text-[#0F1115] rounded-xl text-sm hover:bg-[#F2F1EB] transition-colors"
            >
              PDF
            </a>
          )}
        </div>
      )}
    </div>
  )
}
