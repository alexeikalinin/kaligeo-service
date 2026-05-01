"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function SubmitPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const form = e.currentTarget
    const data = {
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

  const field = "w-full bg-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-600"

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-8">Новый аудит</h1>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Название компании *</label>
          <input name="companyName" required placeholder="Например: ВкусВилл" className={field} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">URL сайта *</label>
          <input name="websiteUrl" type="url" required placeholder="https://vkusvill.ru" className={field} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Ниша и описание бизнеса *</label>
          <textarea
            name="niche"
            required
            rows={3}
            placeholder="Сеть магазинов здорового питания. Основная аудитория — люди, следящие за здоровьем..."
            className={`${field} resize-none`}
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Конкуренты (через запятую)</label>
          <input
            name="competitors"
            placeholder="Азбука Вкуса, Перекрёсток, Лента"
            className={field}
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Email для отчёта *</label>
          <input name="clientEmail" type="email" required placeholder="you@example.com" className={field} />
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1.5">Тариф</label>
          <select name="tier" className={field}>
            <option value="BASIC">Basic (15 запросов)</option>
            <option value="STANDARD" selected>Standard (50 запросов)</option>
            <option value="ADVANCED">Advanced (150 запросов)</option>
          </select>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-zinc-100 text-zinc-900 rounded-xl font-semibold text-sm hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? "Запускаем..." : "Запустить аудит"}
        </button>
      </form>
    </div>
  )
}
