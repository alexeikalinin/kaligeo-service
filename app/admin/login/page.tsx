"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push("/admin")
    } else {
      setError("Неверный пароль")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-xl font-bold text-[#0F1115] text-center mb-8">
          KALIGEO Admin
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Пароль"
            required
            className="w-full bg-[#F2F1EB] text-[#0F1115] placeholder-[#6A6D75] rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#E5E5E1]"
          />
          {error && <p className="text-red-700 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#C8F24A] text-[#0F1115] rounded-xl font-semibold text-sm hover:bg-white transition-colors disabled:opacity-50"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  )
}
