"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  error?: string
}

const errorMessages: Record<string, string> = {
  invalid: "Ссылка недействительна.",
  expired: "Ссылка устарела. Запросите новую.",
}

export default function MagicLinkForm({ error }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState(error ? (errorMessages[error] ?? "Ошибка входа.") : "")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError("")
    setLoading(true)

    try {
      const res = await fetch("/api/client/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (res.status === 429) {
        setFormError("Слишком много попыток. Подождите 5 минут.")
        return
      }

      router.push("/my/login?sent=1")
    } catch {
      setFormError("Ошибка сети. Попробуйте ещё раз.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {formError && (
        <div
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            fontSize: "14px",
          }}
        >
          {formError}
        </div>
      )}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        disabled={loading}
        style={{
          width: "100%",
          padding: "14px 16px",
          borderRadius: "var(--radius-md)",
          border: "1.5px solid var(--rule)",
          background: "white",
          color: "var(--ink)",
          fontSize: "15px",
          fontFamily: "var(--font-sans)",
          outline: "none",
          transition: "border-color 0.15s",
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          e.target.style.borderColor = "var(--ink)"
        }}
        onBlur={(e) => {
          e.target.style.borderColor = "var(--rule)"
        }}
      />

      <button
        type="submit"
        disabled={loading || !email}
        style={{
          padding: "14px 24px",
          borderRadius: "var(--radius-md)",
          background: loading || !email ? "var(--bone-2)" : "var(--accent)",
          color: loading || !email ? "var(--ink-3)" : "var(--accent-ink)",
          border: "none",
          fontSize: "15px",
          fontWeight: 700,
          cursor: loading || !email ? "default" : "pointer",
          fontFamily: "var(--font-sans)",
          transition: "all 0.15s",
        }}
      >
        {loading ? "Отправляем..." : "Получить ссылку →"}
      </button>
    </form>
  )
}
