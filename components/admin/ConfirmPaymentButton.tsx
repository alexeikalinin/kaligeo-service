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
    return <span className="text-xs text-emerald-700">✓ Запущен</span>
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-3 py-1 rounded bg-[#C8F24A] text-black font-semibold hover:bg-[#C8F24A] transition-colors"
      >
        Подтвердить оплату
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white border border-[#E5E5E1] rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-base font-bold mb-4">Подтверждение оплаты</h3>

            <div className="mb-4">
              <label className="text-xs text-[#6A6D75] block mb-1">Тариф</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                className="w-full bg-[#F2F1EB] border border-[#E5E5E1] rounded px-3 py-2 text-sm text-[#0F1115]"
              >
                <option value="BASIC">Basic — $50</option>
                <option value="STANDARD">Standard — $150</option>
                <option value="ADVANCED">Advanced — $300</option>
              </select>
            </div>

            <div className="mb-5">
              <label className="text-xs text-[#6A6D75] block mb-1">Заметки (необязательно)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Оплата через Stripe #xxxx"
                className="w-full bg-[#F2F1EB] border border-[#E5E5E1] rounded px-3 py-2 text-sm text-[#0F1115] placeholder-[#6A6D75]"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirm}
                disabled={loading}
                className="flex-1 py-2 rounded bg-[#C8F24A] text-[#0F1115] text-sm font-semibold hover:bg-[#B9E437] transition-colors disabled:opacity-50"
              >
                {loading ? "Запускаем..." : "✓ Оплачено — Запустить аудит"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded bg-[#F2F1EB] text-[#0F1115] text-sm hover:bg-[#F2F1EB] transition-colors"
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
