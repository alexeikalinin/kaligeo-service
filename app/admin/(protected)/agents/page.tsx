"use client"

import { useState } from "react"

export default function AgentsPage() {
  const [task, setTask] = useState("")
  const [context, setContext] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setResult("")

    let parsedContext: Record<string, unknown> = {}
    if (context.trim()) {
      try {
        parsedContext = JSON.parse(context)
      } catch {
        setError("Контекст должен быть валидным JSON (или оставьте поле пустым)")
        setLoading(false)
        return
      }
    }

    const res = await fetch("/api/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task, context: parsedContext }),
    })

    const text = await res.text()
    if (res.ok) {
      setResult(text)
    } else {
      setError(text || `Ошибка ${res.status}`)
    }
    setLoading(false)
  }

  const field = "w-full bg-white border border-[#E5E5E1] text-[#0F1115] placeholder-[#6A6D75] rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-[#E5E5E1] focus:border-[#E5E5E1] transition-colors"
  const label = "block text-sm font-medium text-[#0F1115] mb-2"

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Агенты</h1>
      <p className="text-[#6A6D75] text-sm mb-10">
        Ручной вызов orchestrator — Claude сам решает, каких агентов вызвать
        (анализ, контент, риск, бенчмарк, лид-скоринг, outreach, оптимизация запросов, анализ сайта).
      </p>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className={label}>Задача *</label>
          <textarea
            required
            rows={4}
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Например: оцени риск для платформ CHATGPT и GEMINI перед запуском аудита"
            className={`${field} resize-none`}
          />
        </div>
        <div>
          <label className={label}>
            Контекст <span className="text-[#6A6D75] font-normal">(опционально, JSON)</span>
          </label>
          <textarea
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder='{"jobId": "..."}'
            className={`${field} resize-none font-mono text-sm`}
          />
        </div>
        {error && <p className="text-red-700 text-base">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-[#F2F1EB] text-[#0F1115] rounded-xl font-semibold text-base hover:bg-white transition-colors disabled:opacity-50"
        >
          {loading ? "Выполняем..." : "Запустить"}
        </button>
      </form>
      {result && (
        <div className="mt-10">
          <p className={label}>Ответ</p>
          <pre className="whitespace-pre-wrap bg-white border border-[#E5E5E1] rounded-xl p-5 text-sm text-[#0F1115]">
            {result}
          </pre>
        </div>
      )}
    </div>
  )
}
