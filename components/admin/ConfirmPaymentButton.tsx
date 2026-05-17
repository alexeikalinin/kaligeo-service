"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  jobId: string
  currentTier: string
}

export function ConfirmPaymentButton({ jobId, currentTier }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tier, setTier] = useState(currentTier)
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function confirm() {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, adminNotes: notes }),
      })
      if (res.ok) {
        setDone(true)
        setOpen(false)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return <span className="text-xs text-emerald-400">✓ Запущен</span>
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1 rounded bg-yellow-500 text-black font-semibold hover:bg-yellow-400 transition-colors"
      >
        Подтвердить оплату
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-base font-bold mb-4">Подтверждение оплаты</h3>

            <div className="mb-4">
              <label className="text-xs text-zinc-500 block mb-1">Тариф</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100"
              >
                <option value="BASIC">Basic — $50</option>
                <option value="STANDARD">Standard — $150</option>
                <option value="ADVANCED">Advanced — $300</option>
              </select>
            </div>

            <div className="mb-5">
              <label className="text-xs text-zinc-500 block mb-1">Заметки (необязательно)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Оплата через Stripe #xxxx"
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirm}
                disabled={loading}
                className="flex-1 py-2 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                {loading ? "Запускаем..." : "✓ Оплачено — Запустить аудит"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded bg-zinc-700 text-zinc-300 text-sm hover:bg-zinc-600 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
