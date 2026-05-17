"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function FreemiumForm() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    // Normalize URL
    const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`

    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/freemium/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: normalized }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        setError(data.error ?? "Ошибка анализа")
        return
      }

      const { scanId } = (await res.json()) as { scanId: string }
      router.push(`/preview/${scanId}`)
    } catch {
      setError("Не удалось подключиться. Проверьте интернет.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="company.ru"
          disabled={loading}
          className="flex-1 rounded-lg px-4 py-3 text-sm font-medium disabled:opacity-60"
          style={{
            background: "rgba(250,250,247,0.08)",
            border: "1px solid var(--ink-border)",
            color: "var(--bone)",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="px-5 py-3 rounded-lg font-bold text-sm disabled:opacity-50 transition-opacity hover:opacity-85"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          {loading ? "Анализирую..." : "Проверить →"}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>
          {error}
        </p>
      )}
    </form>
  )
}
