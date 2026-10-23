"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"

type JobStatus =
  | "PENDING_PAYMENT"
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
  testRun?: boolean
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
  const [paymentMessage, setPaymentMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    let stopped = false
    let finished = false
    let inFlight = false
    const poll = async () => {
      if (finished || stopped || inFlight) return
      inFlight = true
      try {
        const res = await fetch(`/api/audit/${id}/status`)
        if (!res.ok) {
          setError("Аудит не найден")
          return
        }
        const json: StatusResponse = await res.json()
        if (stopped) return
        setError(null)
        setData(json)
        if (json.status === "PENDING_PAYMENT") {
          const paymentResponse = await fetch(`/api/payment/status?jobId=${encodeURIComponent(id)}`)
          const payment = await paymentResponse.json()
          if (stopped) return
          setPaymentMessage(payment.paid
            ? "Оплата подтверждена. Аудит запускается…"
            : "Оплата пока не подтверждена. Проверяем автоматически. Если оплата не прошла, свяжитесь с поддержкой и укажите номер заказа ниже.")
        }

        if (json.status === "COMPLETED" && json.reportUrl) {
          router.push(json.reportUrl)
          return
        }
        if (json.status === "FAILED" || json.status === "COMPLETED") finished = true
      } catch {
        if (!stopped) setError("Ошибка загрузки статуса. Повторяем проверку…")
      } finally {
        inFlight = false
      }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => { stopped = true; clearInterval(interval) }
  }, [id, router])

  const currentStep = data ? STATUS_ORDER.indexOf(data.status) : 0

  return (
    <div className="min-h-screen bg-[var(--bone)] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-[var(--ink)] mb-2">
            {data?.companyName ?? "KaliGEO"}
          </h1>
          <p className="text-[var(--ink-3)] text-sm">{data?.status === "COMPLETED" ? "Аудит готов" : data?.status === "FAILED" ? "Аудит остановлен" : data?.status === "PENDING_PAYMENT" ? "Подтверждение оплаты" : "AI-аудит в процессе..."}</p>
        </div>

        {data?.status === "PENDING_PAYMENT" && <p className="text-[var(--ink-2)] text-sm mb-6">{paymentMessage || "Проверяем оплату…"}</p>}
        {data?.status === "COMPLETED" && (
          <div className="text-[var(--ink-2)] text-sm mb-6">
            <p>{data.testRun ? "Тестовый аудит завершён без оплаты и отправки писем. Отчёт доступен в личном кабинете." : "Ссылка на отчёт отправлена на вашу почту. Отчёт также доступен в личном кабинете."}</p>
            <a href="/my/login" className="inline-block mt-3 underline">Открыть личный кабинет →</a>
          </div>
        )}
        {error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm text-center">
            {error}
          </div>
        ) : (
          <div className="space-y-3">
            {STEPS.filter(step => !data?.testRun || step.key !== "DELIVERING").map((step, i) => {
              const isDone = i < currentStep
              const isActive = i === currentStep && data?.status !== "COMPLETED"
              const isCompleted = data?.status === "COMPLETED"

              return (
                <div
                  key={step.key}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    isCompleted || isDone
                      ? "text-[var(--ink-2)]"
                      : isActive
                        ? "text-[var(--ink)] bg-[var(--bone-2)]"
                        : "text-[var(--ink-3)]"
                  }`}
                >
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0">
                    {isCompleted || isDone ? (
                      <span className="text-emerald-400">✓</span>
                    ) : isActive ? (
                      <span className="w-3 h-3 rounded-full bg-[var(--ink-3)] animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[var(--rule)]" />
                    )}
                  </span>
                  <span className="text-sm">{step.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {data?.status === "FAILED" && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-700 text-sm mb-3">
              {data.errorMessage ?? "Произошла ошибка при выполнении аудита"}
            </p>
            <a href="/my/login" className="block text-[var(--ink)] text-sm underline">
              Открыть личный кабинет
            </a>
            <p className="text-[var(--ink-3)] text-xs mt-3">Повторно оплачивать этот аудит не нужно. Обратитесь в поддержку через контакты на сайте.</p>
          </div>
        )}
        <p className="mt-6 text-[var(--ink-3)] text-xs break-all">Номер заказа: {id}</p>
      </div>
    </div>
  )
}
