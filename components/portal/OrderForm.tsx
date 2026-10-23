"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import type { Tier } from "@/lib/gates"
import type { Market } from "@/lib/market"

export default function OrderForm({ tier, market, initialCompany, initialWebsite, initialNiche }: {
  tier: Tier; market: Market; initialCompany: string; initialWebsite: string; initialNiche: string
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [jobId, setJobId] = useState<string | null>(null)
  const submitting = useRef(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    submitting.current = true
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setError("")
    try {
      let currentJobId = jobId
      if (!currentJobId) {
        const response = await fetch("/api/audit/submit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier, clientEmail: data.get("email"), companyName: data.get("company"),
            websiteUrl: data.get("website"), niche: data.get("niche"), source: "app-order" }),
        })
        const result = await response.json()
        if (!response.ok || !result.jobId) throw new Error("Не удалось создать заказ. Проверьте поля и попробуйте ещё раз.")
        currentJobId = result.jobId
        setJobId(currentJobId)
      }
      const response = await fetch("/api/payment/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentJobId, locale: market }),
      })
      const payment = await response.json()
      if (!response.ok || !payment.formUrl) throw new Error(payment.errorMessage || payment.error || "Не удалось открыть оплату.")
      window.location.assign(payment.formUrl)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Ошибка соединения. Попробуйте ещё раз.")
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <fieldset disabled={busy || !!jobId} className="space-y-4 disabled:opacity-60">
        {[
          { name: "email", label: "Email для получения отчёта", type: "email", value: "", max: 254 },
          { name: "company", label: "Бренд / название компании", type: "text", value: initialCompany, max: 100 },
          { name: "website", label: "Сайт (https://…)", type: "url", value: initialWebsite, max: 2000 },
          { name: "niche", label: "Чем занимается компания", type: "text", value: initialNiche, max: 200 },
        ].map(field => (
          <label key={field.name} className="block text-sm">
            {field.label}
            <input name={field.name} type={field.type} defaultValue={field.value} required maxLength={field.max}
              className="block w-full border rounded-lg px-3 py-2 mt-1" style={{ borderColor: "var(--rule)", background: "var(--bone)" }} />
          </label>
        ))}
        <label className="flex gap-2 text-sm">
          <input type="checkbox" required />
          <span>Принимаю <Link href="/legal/offer" target="_blank">оферту</Link> и <Link href="/legal/privacy" target="_blank">условия обработки персональных данных</Link>.</span>
        </label>
      </fieldset>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={busy} className="px-5 py-3 rounded-lg font-semibold disabled:opacity-60"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
        {busy ? "Открываем оплату…" : "Перейти к оплате →"}
      </button>
      <p className="text-xs">Аудит начнётся после подтверждения оплаты. Отчёт придёт на указанный email.</p>
    </form>
  )
}
