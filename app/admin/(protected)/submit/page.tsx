"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

interface PreviousAudit {
  id: string
  companyName: string
  tier: string
  completedAt: string
  overallScore: number | null
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export default function SubmitPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [previousAudits, setPreviousAudits] = useState<PreviousAudit[]>([])
  const [baselineJobId, setBaselineJobId] = useState("")
  const debouncedUrl = useDebounce(websiteUrl, 600)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!debouncedUrl) {
      setPreviousAudits([])
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    fetch(`/api/admin/audit/history?websiteUrl=${encodeURIComponent(debouncedUrl)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPreviousAudits(data)
      })
      .catch(() => {})
  }, [debouncedUrl])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = e.currentTarget
    const data: Record<string, unknown> = {
      companyName: (form.elements.namedItem("companyName") as HTMLInputElement).value,
      websiteUrl: (form.elements.namedItem("websiteUrl") as HTMLInputElement).value,
      niche: (form.elements.namedItem("niche") as HTMLTextAreaElement).value,
      competitors: (form.elements.namedItem("competitors") as HTMLInputElement).value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      clientEmail: (form.elements.namedItem("clientEmail") as HTMLInputElement).value,
      tier: (form.elements.namedItem("tier") as HTMLSelectElement).value,
    }

    if (baselineJobId) data.baselineJobId = baselineJobId

    const res = await fetch("/api/audit/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      const { jobId } = await res.json()
      router.push(`/admin/jobs/${jobId}`)
    } else {
      const err = await res.json()
      setError(JSON.stringify(err.error))
      setLoading(false)
    }
  }

  const field = "w-full bg-zinc-900 border border-zinc-600 text-zinc-100 placeholder-zinc-500 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-zinc-400 focus:border-zinc-400 transition-colors"
  const label = "block text-sm font-medium text-zinc-300 mb-2"

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold mb-10">Новый аудит</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={label}>Название компании *</label>
          <input name="companyName" required placeholder="Например: ВкусВилл" className={field} />
        </div>
        <div>
          <label className={label}>URL сайта *</label>
          <input
            name="websiteUrl"
            type="url"
            required
            placeholder="https://vkusvill.ru"
            className={field}
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value)
              setBaselineJobId("")
            }}
          />
        </div>
        <div>
          <label className={label}>Ниша и описание бизнеса *</label>
          <textarea
            name="niche"
            required
            rows={3}
            placeholder="Сеть магазинов здорового питания. Основная аудитория — люди, следящие за здоровьем..."
            className={`${field} resize-none`}
          />
        </div>
        <div>
          <label className={label}>Конкуренты (через запятую)</label>
          <input
            name="competitors"
            placeholder="Азбука Вкуса, Перекрёсток, Лента"
            className={field}
          />
        </div>
        <div>
          <label className={label}>Email для отчёта *</label>
          <input name="clientEmail" type="email" required placeholder="you@example.com" className={field} />
        </div>
        <div>
          <label className={label}>Тариф</label>
          <select name="tier" className={field}>
            <option value="BASIC">Basic (15 запросов)</option>
            <option value="STANDARD">Standard (50 запросов)</option>
            <option value="ADVANCED">Advanced (150 запросов)</option>
          </select>
        </div>

        {previousAudits.length > 0 && (
          <div>
            <label className={label}>
              Базовый аудит для сравнения{" "}
              <span className="text-zinc-500 font-normal">(опционально)</span>
            </label>
            <select
              value={baselineJobId}
              onChange={(e) => setBaselineJobId(e.target.value)}
              className={field}
            >
              <option value="">— не выбрано (новый клиент) —</option>
              {previousAudits.map((a) => (
                <option key={a.id} value={a.id}>
                  {new Date(a.completedAt).toLocaleDateString("ru-RU")}
                  {" · "}
                  {a.companyName}
                  {" · "}
                  {a.tier}
                  {a.overallScore !== null ? ` · score ${a.overallScore}` : ""}
                </option>
              ))}
            </select>
            {baselineJobId && (
              <p className="mt-2 text-xs text-zinc-400">
                В новом отчёте появится таб «Прогресс» с динамикой относительно выбранного аудита.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-red-400 text-base">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-xl font-semibold text-base hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? "Запускаем..." : "Запустить аудит"}
        </button>
      </form>
    </div>
  )
}
