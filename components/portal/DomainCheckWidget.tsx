"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ScoreRing } from "@/components/report/ScoreRing"
import type { DomainCheckResponse, DomainCheckResult } from "@/app/api/tools/domain-check/route"

const IMPACT_LABEL = { high: "Критично", medium: "Важно", low: "Желательно" }
const IMPACT_COLOR = { high: "var(--danger)", medium: "var(--warn)", low: "var(--ink-3)" }

export default function DomainCheckWidget() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<DomainCheckResponse | null>(null)
  const [error, setError] = useState("")
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError, setScanError] = useState("")

  async function handleCheck(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setResult(null)
    setScanError("")
    setLoading(true)

    try {
      const res = await fetch("/api/tools/domain-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? "Ошибка проверки")
        return
      }
      setResult(data)
    } catch {
      setError("Ошибка сети. Проверьте интернет и попробуйте снова.")
    } finally {
      setLoading(false)
    }
  }

  async function handleFreemiumScan() {
    setScanError("")
    setScanLoading(true)
    try {
      const res = await fetch("/api/freemium/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: result?.url ?? url, source: "domain-check" }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "Ошибка скана")
      router.push(`/preview/${data.scanId}`)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : "Ошибка скана")
      setScanLoading(false)
    }
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Input */}
      <form onSubmit={handleCheck} style={{ display: "flex", gap: "10px" }}>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://your-site.ru"
          required
          disabled={loading}
          style={{
            flex: 1,
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            border: "1.5px solid var(--rule)",
            background: "white",
            color: "var(--ink)",
            fontSize: "15px",
            fontFamily: "var(--font-sans)",
            outline: "none",
            transition: "border-color 0.15s",
          }}
          onFocus={(e) => { e.target.style.borderColor = "var(--ink)" }}
          onBlur={(e) => { e.target.style.borderColor = "var(--rule)" }}
        />
        <button
          type="submit"
          disabled={loading || !url}
          style={{
            padding: "14px 22px",
            borderRadius: "var(--radius-md)",
            background: loading || !url ? "var(--bone-2)" : "var(--accent)",
            color: loading || !url ? "var(--ink-3)" : "var(--accent-ink)",
            border: "none",
            fontSize: "15px",
            fontWeight: 700,
            cursor: loading || !url ? "default" : "pointer",
            fontFamily: "var(--font-sans)",
            whiteSpace: "nowrap",
            transition: "all 0.15s",
          }}
        >
          {loading ? "Проверяем..." : "Проверить →"}
        </button>
      </form>

      {error && (
        <div
          style={{
            background: "#fef2f2",
            color: "#dc2626",
            borderRadius: "var(--radius-md)",
            padding: "12px 16px",
            fontSize: "14px",
          }}
        >
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--rule)",
            overflow: "hidden",
            background: "var(--bone)",
          }}
        >
          {/* Score header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              padding: "24px",
              background: "var(--bone-2)",
              borderBottom: "1px solid var(--rule)",
            }}
          >
            <ScoreRing score={result.score} size={88} strokeWidth={7} animated />
            <div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                  marginBottom: "4px",
                }}
              >
                AI-готовность
              </div>
              <div
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "20px",
                  fontWeight: 400,
                  color: "var(--ink)",
                }}
              >
                {result.score === 100
                  ? "Отличная — сайт полностью готов"
                  : result.score >= 75
                    ? "Хорошая — остались детали"
                    : result.score >= 50
                      ? "Средняя — есть что улучшить"
                      : result.score >= 25
                        ? "Низкая — критические пробелы"
                        : "Сайт не готов к AI-индексации"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "4px" }}>
                {new URL(result.url).hostname}
              </div>
            </div>
          </div>

          {/* Checks */}
          <div>
            {result.checks.map((check, i) => (
              <CheckRow key={check.id} check={check} last={i === result.checks.length - 1} />
            ))}
          </div>

          {/* Step 2: AI scan */}
          <div
            style={{
              padding: "20px 24px",
              borderTop: "1px solid var(--rule)",
              background: "var(--bone-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                  background: "var(--accent)",
                  padding: "2px 7px",
                  borderRadius: "4px",
                  fontWeight: 700,
                }}
              >
                Шаг 2
              </span>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
                Как вас <em>реально видят</em> AI-ассистенты?
              </span>
            </div>
            <p style={{ margin: "0 0 14px", fontSize: "13px", color: "var(--ink-3)", lineHeight: 1.55 }}>
              Техническая готовность — это фундамент. Шаг 2: запустим реальные запросы
              к ChatGPT, Claude и Perplexity и посмотрим, упоминают ли они вас — бесплатно, ~2 мин.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={handleFreemiumScan}
                disabled={scanLoading}
                style={{
                  background: scanLoading ? "var(--bone-2)" : "var(--ink)",
                  color: scanLoading ? "var(--ink-3)" : "var(--bone)",
                  border: scanLoading ? "1px solid var(--rule)" : "none",
                  borderRadius: "var(--radius-md)",
                  padding: "11px 20px",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: scanLoading ? "default" : "pointer",
                  fontFamily: "var(--font-sans)",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s",
                }}
              >
                {scanLoading ? "Запускаем скан..." : "Запустить AI-скан бесплатно →"}
              </button>
              <a
                href="/my/login"
                style={{
                  display: "inline-block",
                  border: "1px solid var(--rule)",
                  color: "var(--ink-2)",
                  borderRadius: "var(--radius-md)",
                  padding: "11px 20px",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Личный кабинет
              </a>
            </div>
            {scanLoading && (
              <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--ink-3)" }}>
                Отправляем запросы к AI-платформам — это займёт 1–3 минуты...
              </p>
            )}
            {scanError && (
              <p style={{ margin: "10px 0 0", fontSize: "13px", color: "var(--danger)" }}>
                {scanError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div
          style={{
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--rule)",
            padding: "32px 24px",
            textAlign: "center",
            color: "var(--ink-3)",
            fontSize: "14px",
          }}
        >
          <div style={{ marginBottom: "12px", fontSize: "24px" }}>⏳</div>
          Проверяем robots.txt, llms.txt, Schema.org и SSR...
        </div>
      )}
    </div>
  )
}

function CheckRow({ check, last }: { check: DomainCheckResult; last: boolean }) {
  const [open, setOpen] = useState(!check.passed)

  return (
    <div
      style={{
        borderBottom: last ? "none" : "1px solid var(--rule)",
        padding: "0",
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 24px",
          background: "none",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.1s",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bone-2)" }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "none" }}
      >
        {/* Status icon */}
        <span style={{ fontSize: "18px", flexShrink: 0 }}>
          {check.passed ? "✅" : "❌"}
        </span>

        {/* Label */}
        <span style={{ flex: 1, fontSize: "14px", fontWeight: 500, color: "var(--ink)" }}>
          {check.label}
        </span>

        {/* Impact badge */}
        {!check.passed && (
          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: IMPACT_COLOR[check.impact],
              flexShrink: 0,
            }}
          >
            {IMPACT_LABEL[check.impact]}
          </span>
        )}

        {/* Toggle arrow */}
        {!check.passed && check.fixHint && (
          <span
            style={{
              fontSize: "12px",
              color: "var(--ink-3)",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
              flexShrink: 0,
            }}
          >
            ▾
          </span>
        )}
      </button>

      {/* Fix hint */}
      {!check.passed && check.fixHint && open && (
        <div
          style={{
            padding: "0 24px 16px 54px",
            fontSize: "13px",
            color: "var(--ink-3)",
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--ink-2)" }}>Как исправить:</strong> {check.fixHint}
        </div>
      )}
    </div>
  )
}
