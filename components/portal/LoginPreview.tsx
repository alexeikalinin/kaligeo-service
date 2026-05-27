"use client"

import { useEffect, useState } from "react"

const DEMO_PLATFORMS = [
  { name: "ChatGPT", score: 72, color: "#10a37f" },
  { name: "Claude", score: 58, color: "#d97706" },
  { name: "Gemini", score: 43, color: "#3b82f6" },
  { name: "Яндекс", score: 22, color: "#ff0000" },
]

const OVERALL = 67

export default function LoginPreview() {
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300)
    return () => clearTimeout(t)
  }, [])

  const r = 44
  const circ = 2 * Math.PI * r
  const offset = animated ? circ * (1 - OVERALL / 100) : circ

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "340px",
        borderRadius: "var(--radius-lg)",
        background: "var(--bone)",
        padding: "28px",
        boxShadow: "0 4px 32px rgba(0,0,0,0.08)",
      }}
    >
      {/* Score ring */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div style={{ position: "relative", display: "inline-block" }}>
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle
              cx="55"
              cy="55"
              r={r}
              fill="none"
              stroke="var(--bone-2)"
              strokeWidth="8"
            />
            <circle
              cx="55"
              cy="55"
              r={r}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 55 55)"
              style={{ transition: "stroke-dashoffset 1s ease-out" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "26px",
                fontWeight: 700,
                lineHeight: 1,
              }}
            >
              {OVERALL}
            </span>
            <span style={{ fontSize: "11px", color: "var(--ink-3)" }}>/100</span>
          </div>
        </div>
        <p style={{ fontSize: "13px", color: "var(--ink-2)", margin: "8px 0 0" }}>
          Общий AI Score
        </p>
      </div>

      {/* Platform bars */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
        {DEMO_PLATFORMS.map((p) => (
          <div key={p.name} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--ink-3)",
                width: "64px",
                flexShrink: 0,
              }}
            >
              {p.name}
            </span>
            <div
              style={{
                flex: 1,
                height: "6px",
                borderRadius: "3px",
                background: "var(--bone-2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  borderRadius: "3px",
                  background: p.color,
                  width: animated ? `${p.score}%` : "0%",
                  transition: "width 0.8s ease-out",
                  transitionDelay: `${DEMO_PLATFORMS.indexOf(p) * 0.1}s`,
                }}
              />
            </div>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "12px",
                fontWeight: 600,
                width: "28px",
                textAlign: "right",
                color: "var(--ink-2)",
              }}
            >
              {p.score}
            </span>
          </div>
        ))}
      </div>

      {/* Narrative */}
      <div
        style={{
          background: "var(--bone-2)",
          borderRadius: "var(--radius-md)",
          padding: "12px 14px",
          fontSize: "12px",
          color: "var(--ink-2)",
          lineHeight: 1.6,
        }}
      >
        Бренд виден в <strong>{OVERALL}%</strong> AI-запросов.
        ChatGPT — сильная платформа. Главный пробел: Яндекс.
      </div>
    </div>
  )
}
