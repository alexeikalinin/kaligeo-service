"use client"

import { useState } from "react"
import Link from "next/link"

export default function RecoverPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await fetch("/api/report/recover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <Link href="/" className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-8 inline-block">
          KALIGEO
        </Link>

        {sent ? (
          <div>
            <p className="text-2xl mb-3">📬</p>
            <h1 className="text-xl font-bold text-zinc-100 mb-2">Письмо отправлено</h1>
            <p className="text-zinc-400 text-sm mb-6">
              Если на этот email есть завершённые аудиты — вы получите ссылки в течение минуты.
            </p>
            <Link
              href="/"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← Назад
            </Link>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-bold text-zinc-100 mb-2">Восстановить доступ к отчёту</h1>
            <p className="text-zinc-400 text-sm mb-8">
              Введите email, который вы указывали при заказе аудита — мы пришлём ссылки на все ваши отчёты.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-600"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-zinc-100 text-zinc-900 rounded-xl font-semibold text-sm hover:bg-white transition-colors disabled:opacity-50"
              >
                {loading ? "Отправляем..." : "Получить ссылки"}
              </button>
            </form>
            <Link
              href="/"
              className="block mt-6 text-sm text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              ← Назад
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
