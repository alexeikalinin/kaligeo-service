"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function ProfileForm({ displayName, companyName }: { displayName: string; companyName: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/client/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: data.get("displayName"), companyName: data.get("companyName") }),
      })
      if (!response.ok) throw new Error("Не удалось сохранить профиль.")
      setMessage("Профиль сохранён.")
      router.refresh()
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Ошибка соединения.")
    } finally { setBusy(false) }
  }

  return <form onSubmit={save} className="space-y-3">
    <label className="block text-sm">Как к вам обращаться
      <input name="displayName" defaultValue={displayName} maxLength={100} placeholder="Ваше имя"
        className="block border rounded-lg px-3 py-2 w-full mt-1" style={{ borderColor: "var(--rule)", background: "var(--bone)" }} />
    </label>
    <label className="block text-sm">Название компании в аккаунте
      <input name="companyName" defaultValue={companyName} maxLength={100} required
        className="block border rounded-lg px-3 py-2 w-full mt-1" style={{ borderColor: "var(--rule)", background: "var(--bone)" }} />
    </label>
    <button disabled={busy} className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
      style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>{busy ? "Сохраняем…" : "Сохранить профиль"}</button>
    {message && <p role="status" className="text-sm">{message}</p>}
  </form>
}
