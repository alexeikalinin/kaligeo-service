"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type State = "idle" | "loading" | "success" | "error"

const PDF_BLOB_URL = process.env.NEXT_PUBLIC_RESEARCH_PDF_URL ?? ""

export default function Research2026Form() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  // Freemium scan state (shown in success block)
  const [scanUrl, setScanUrl] = useState("")
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState("")

  async function handleScan(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = scanUrl.trim()
    if (!trimmed) return
    const normalized = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
    setScanLoading(true)
    setScanError("")
    try {
      const res = await fetch("/api/freemium/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: normalized, source: "research-2026" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string }
        setScanError(data.error ?? "Ошибка анализа")
        return
      }
      const { scanId } = await res.json() as { scanId: string }
      router.push(`/preview/${scanId}`)
    } catch {
      setScanError("Не удалось подключиться. Проверьте интернет.")
    } finally {
      setScanLoading(false)
    }
  }

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
          padding: "28px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        {/* PDF confirmation */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "var(--accent)",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 400, margin: "0 0 6px", color: "var(--ink)" }}>
              PDF отправлен на почту
            </p>
            <p style={{ fontSize: "13px", color: "var(--ink-3)", margin: 0, lineHeight: 1.5 }}>
              Письмо придёт в течение минуты. Если нет — проверьте «Спам».
            </p>
            {PDF_BLOB_URL && (
              <a
                href={PDF_BLOB_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: "13px", color: "var(--ink)", display: "inline-block", marginTop: "8px", textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                Скачать сразу →
              </a>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--rule)" }} />

        {/* Freemium scan CTA */}
        <div>
          <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)", margin: "0 0 4px" }}>
            Пока PDF грузится — проверьте свою компанию
          </p>
          <p style={{ fontSize: "13px", color: "var(--ink-3)", margin: "0 0 14px", lineHeight: 1.5 }}>
            Введите URL сайта и узнайте свой AI Score прямо сейчас. Бесплатно, 2 минуты.
          </p>
          <form onSubmit={handleScan} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="text"
              value={scanUrl}
              onChange={(e) => setScanUrl(e.target.value)}
              placeholder="company.ru"
              disabled={scanLoading}
              style={{
                width: "100%",
                background: "var(--bone)",
                border: "1px solid var(--rule)",
                color: "var(--ink)",
                borderRadius: "var(--radius-md)",
                padding: "11px 14px",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                opacity: scanLoading ? 0.6 : 1,
              }}
            />
            <button
              type="submit"
              disabled={scanLoading || !scanUrl.trim()}
              style={{
                background: scanLoading ? "var(--bone)" : "var(--accent)",
                color: scanLoading ? "var(--ink-3)" : "var(--accent-ink)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "11px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: scanLoading || !scanUrl.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {scanLoading ? "Анализирую..." : "Узнать AI Score →"}
            </button>
            {scanError && (
              <p style={{ fontSize: "12px", color: "var(--danger)", margin: 0 }}>{scanError}</p>
            )}
          </form>
        </div>
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
