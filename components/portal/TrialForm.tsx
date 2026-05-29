"use client"

import { useState } from "react"

type State = "idle" | "loading" | "success" | "error" | "used"

export default function TrialForm() {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const [email, setEmail] = useState("")
  const [company, setCompany] = useState("")
  const [website, setWebsite] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState("loading")
    setErrorMsg("")

    try {
      const res = await fetch("/api/client/auth/trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          companyName: company,
          websiteUrl: website.startsWith("http") ? website : `https://${website}`,
          niche: "",
          competitors: [],
        }),
      })

      if (res.status === 409) {
        setState("used")
        return
      }
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
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: "inline-block",
          background: "var(--accent)",
          color: "var(--accent-ink)",
          borderRadius: "var(--radius-md)",
          padding: "11px 22px",
          fontSize: "14px",
          fontWeight: 700,
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
        }}
      >
        Запустить бесплатный аудит →
      </button>
    )
  }

  return (
    <div
      style={{
        background: "var(--bone)",
        border: "1px solid var(--rule)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        maxWidth: "400px",
        margin: "0 auto",
        textAlign: "left",
      }}
    >
      {state === "success" ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-serif)", fontSize: "20px", margin: "0 0 8px", color: "var(--ink)" }}>
            Аудит запущен!
          </p>
          <p style={{ fontSize: "14px", color: "var(--ink-3)", margin: "0 0 16px" }}>
            Проверьте почту — мы отправили ссылку для входа в личный кабинет.
            Результаты будут готовы через 5–10 минут.
          </p>
          <a
            href="/my/login"
            style={{
              fontSize: "14px",
              color: "var(--ink)",
              textDecoration: "none",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            Войти в личный кабинет →
          </a>
        </div>
      ) : state === "used" ? (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "14px", color: "var(--ink-2)", margin: "0 0 16px" }}>
            Бесплатный аудит уже использован. Войдите в личный кабинет для заказа нового аудита.
          </p>
          <a
            href="/my/login"
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: "var(--radius-md)",
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Войти в кабинет →
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", display: "block", marginBottom: "4px" }}>
              Email
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
            <label style={{ fontSize: "12px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", display: "block", marginBottom: "4px" }}>
              Название компании
            </label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Компания"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: "12px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", display: "block", marginBottom: "4px" }}>
              Сайт
            </label>
            <input
              type="text"
              required
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="company.ru"
              style={inputStyle}
            />
          </div>

          {state === "error" && (
            <p style={{ fontSize: "13px", color: "var(--danger)", margin: 0 }}>{errorMsg}</p>
          )}

          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              type="submit"
              disabled={state === "loading"}
              style={{
                flex: 1,
                background: state === "loading" ? "var(--bone-2)" : "var(--accent)",
                color: state === "loading" ? "var(--ink-3)" : "var(--accent-ink)",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "11px",
                fontSize: "14px",
                fontWeight: 700,
                cursor: state === "loading" ? "not-allowed" : "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              {state === "loading" ? "Запускаем..." : "Запустить аудит →"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: "none",
                border: "1px solid var(--rule)",
                borderRadius: "var(--radius-md)",
                padding: "11px 14px",
                fontSize: "13px",
                color: "var(--ink-3)",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              Отмена
            </button>
          </div>
          <p style={{ fontSize: "11px", color: "var(--ink-3)", margin: 0, textAlign: "center" }}>
            1 BASIC-аудит бесплатно · 3 платформы · 15 запросов
          </p>
        </form>
      )}
    </div>
  )
}
