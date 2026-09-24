"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function SubscriptionCancelButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        style={{
          fontSize: "13px",
          color: "var(--ink-3)",
          background: "none",
          border: "none",
          textDecoration: "underline",
          textUnderlineOffset: "2px",
          cursor: "pointer",
          padding: 0,
        }}
      >
        Отменить подписку
      </button>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
      <span style={{ fontSize: "13px", color: "var(--ink-2)" }}>
        Точно отменить? Доступ сохранится до конца оплаченного периода.
      </span>
      <button
        disabled={loading}
        onClick={async () => {
          setLoading(true)
          try {
            await fetch("/api/client/subscription/cancel", { method: "POST" })
            router.refresh()
          } finally {
            setLoading(false)
            setConfirming(false)
          }
        }}
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "#fff",
          background: "#DC2626",
          border: "none",
          borderRadius: "6px",
          padding: "6px 14px",
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Отменяем…" : "Да, отменить"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        style={{ fontSize: "13px", color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer" }}
      >
        Передумал
      </button>
    </div>
  )
}
