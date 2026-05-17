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
  const [tier, setTier] = useState("STANDARD")
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])
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
      ...(selectedPlatforms.length > 0 ? { selectedPlatforms } : {}),
    }

    if (baselineJobId) data.baselineJobId = baselineJobId

    if (scheduleFollowUp) {
      const followUpDate = new Date()
      followUpDate.setDate(followUpDate.getDate() + 30)
      data.followUpScheduledAt = followUpDate.toISOString()
    }

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
          <select
            name="tier"
            className={field}
            value={tier}
            onChange={(e) => {
              setTier(e.target.value)
              setScheduleFollowUp(e.target.value === "ADVANCED")
              setSelectedPlatforms([])
            }}
          >
            <option value="BASIC">Basic (15 запросов)</option>
            <option value="STANDARD">Standard (50 запросов)</option>
            <option value="ADVANCED">Advanced (150 запросов)</option>
          </select>
        </div>

        {(() => {
          const limits: Record<string, number> = { BASIC: 3, STANDARD: 6, ADVANCED: 9 }
          const limit = limits[tier]
          const all = [
            { key: "CHATGPT", label: "ChatGPT" },
            { key: "GEMINI", label: "Gemini" },
            { key: "YANDEXGPT", label: "YandexGPT" },
            { key: "CLAUDE", label: "Claude" },
            { key: "PERPLEXITY", label: "Perplexity" },
            { key: "DEEPSEEK", label: "DeepSeek" },
            { key: "GIGACHAT", label: "GigaChat" },
            { key: "ALISA", label: "Алиса" },
            { key: "GROK", label: "Grok" },
          ]
          const toggle = (key: string) => {
            setSelectedPlatforms((prev) =>
              prev.includes(key) ? prev.filter((k) => k !== key) : prev.length < limit ? [...prev, key] : prev
            )
          }
          return (
            <div>
              <label className={label}>
                Платформы{" "}
                <span className="text-zinc-500 font-normal">
                  — выбрано {selectedPlatforms.length} из {limit} (пусто = дефолты тарифа)
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {all.map(({ key, label: name }) => {
                  const checked = selectedPlatforms.includes(key)
                  const disabled = !checked && selectedPlatforms.length >= limit
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                        checked
                          ? "border-lime-400 bg-lime-400/10 text-lime-300"
                          : disabled
                          ? "border-zinc-700 text-zinc-600 cursor-not-allowed"
                          : "border-zinc-600 text-zinc-300 hover:border-zinc-400"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(key)}
                        className="accent-lime-400"
                      />
                      {name}
                    </label>
                  )
                })}
              </div>
            </div>
          )
        })()}

        <div className="flex items-start gap-3 rounded-xl border border-zinc-600 px-4 py-3">
          <input
            id="scheduleFollowUp"
            type="checkbox"
            checked={scheduleFollowUp}
            onChange={(e) => setScheduleFollowUp(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 accent-lime-400 cursor-pointer"
          />
          <label htmlFor="scheduleFollowUp" className="text-sm text-zinc-300 cursor-pointer leading-snug">
            Запланировать повторный аудит через 30 дней
            <span className="block text-xs text-zinc-500 mt-0.5">
              Клиент автоматически получит сравнительный отчёт с динамикой
            </span>
          </label>
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
