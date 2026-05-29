"use client"

import { useState } from "react"

type State = "idle" | "loading" | "success" | "error"

const PDF_BLOB_URL = process.env.NEXT_PUBLIC_RESEARCH_PDF_URL ?? ""

export default function Research2026Form() {
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/research-2026/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error ?? "Ошибка. Попробуйте ещё раз.")
        setState("error")
        return
      }

      setState("success")
    } catch {
      setErrorMsg("Сеть недоступна. Попробуйте позже.")
      setState("error")
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--bone)",
    border: "1px solid var(--rule)",
    color: "var(--ink)",
    borderRadius: "var(--radius-md)",
    padding: "12px 14px",
    fontSize: "15px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  }

  if (state === "success") {
    return (
      <div
        style={{
          background: "var(--bone-2)",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-lg)",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            background: "var(--accent)",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            fontSize: "22px",
          }}
        >
          ✓
        </div>
        <p
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "20px",
            fontWeight: 400,
            margin: "0 0 10px",
            color: "var(--ink)",
          }}
        >
          PDF отправлен на почту
        </p>
        <p style={{ fontSize: "14px", color: "var(--ink-3)", margin: "0 0 24px", lineHeight: 1.6 }}>
          Проверьте inbox — письмо с PDF придёт в течение минуты.
          Если не видите — проверьте папку «Спам».
        </p>
        {PDF_BLOB_URL && (
          <a
            href={PDF_BLOB_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: "var(--radius-md)",
              padding: "11px 22px",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Скачать сразу →
          </a>
        )}
      </div>
    )
  }

  return (
    <div
      style={{
        background: "var(--bone-2)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-lg)",
        padding: "28px 24px",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-serif)",
          fontSize: "20px",
          fontWeight: 400,
          margin: "0 0 6px",
          color: "var(--ink)",
        }}
      >
        Скачать бесплатно
      </p>
      <p style={{ fontSize: "13px", color: "var(--ink-3)", margin: "0 0 20px", lineHeight: 1.5 }}>
        Введите email — PDF придёт на почту мгновенно.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <div>
          <label
            style={{
              fontSize: "11px",
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Рабочий email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.ru"
            style={inputStyle}
          />
        </div>

        <div>
          <label
            style={{
              fontSize: "11px",
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "6px",
            }}
          >
            Компания <span style={{ opacity: 0.5 }}>(необязательно)</span>
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Название компании"
            style={inputStyle}
          />
        </div>

        {state === "error" && (
          <p style={{ fontSize: "13px", color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={state === "loading"}
          style={{
            background: state === "loading" ? "var(--bone)" : "var(--accent)",
            color: state === "loading" ? "var(--ink-3)" : "var(--accent-ink)",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "13px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: state === "loading" ? "not-allowed" : "pointer",
            fontFamily: "var(--font-sans)",
            marginTop: "4px",
          }}
        >
          {state === "loading" ? "Отправляем..." : "Получить PDF →"}
        </button>

        <p style={{ fontSize: "11px", color: "var(--ink-3)", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
          Без спама. Только этот PDF и иногда — новые исследования KaliGEO.
        </p>
      </form>
    </div>
  )
}
