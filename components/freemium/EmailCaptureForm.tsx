"use client"

import { useState } from "react"

interface Props {
  scanId: string
  websiteUrl: string
}

export function EmailCaptureForm({ scanId }: Props) {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = email.trim()
    if (!trimmed) return

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/freemium/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId, email: trimmed }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? "Ошибка отправки")
        return
      }

      setSubmitted(true)
    } catch {
      setError("Не удалось отправить. Проверьте интернет.")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div
        className="rounded-xl p-5 text-center"
        style={{ border: "1px solid var(--accent)", background: "var(--bone-2)" }}
      >
        <p className="font-semibold text-sm mb-1" style={{ color: "var(--ink)" }}>
          Отчёт отправлен — проверьте почту
        </p>
        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Мы также пришлём вам рекомендации по улучшению видимости
        </p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-5 mb-8"
      style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
    >
      <p className="t-eyebrow mb-1">Получите результаты скана на email</p>
      <p className="text-sm mb-4" style={{ color: "var(--ink-3)" }}>
        Score, данные ChatGPT и советы по улучшению — сразу на почту
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          disabled={loading}
          required
          className="flex-1 rounded-lg px-4 py-2.5 text-sm disabled:opacity-60"
          style={{
            background: "var(--bone)",
            border: "1px solid var(--rule)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="px-4 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 transition-opacity hover:opacity-85 whitespace-nowrap"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          {loading ? "Отправка..." : "Получить результаты →"}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}
    </div>
  )
}
