"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"

export type LeadRow = {
  id: string
  websiteUrl: string
  companyName: string
  email: string | null
  score: number
  niche: string
  source: string | null
  createdAt: string
  converted: boolean
  paid: boolean
  emailSequence: {
    sent: number
    opened: boolean
    clicked: boolean
  } | null
}

type Tab = "all" | "no_email" | "unconverted" | "converted"

const SCORE_CLS = (s: number) =>
  s >= 60 ? "text-emerald-700" : s >= 40 ? "text-[#4C6218]" : "text-red-700"

const SCORE_BG = (s: number) =>
  s >= 60 ? "bg-emerald-50" : s >= 40 ? "bg-[#C8F24A]" : "bg-red-50"

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>("unconverted")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return leads.filter((l) => {
      if (tab === "no_email" && l.email) return false
      if (tab === "unconverted" && (l.converted || !l.email)) return false
      if (tab === "converted" && !l.converted) return false
      if (q && !l.companyName.toLowerCase().includes(q) && !(l.email ?? "").toLowerCase().includes(q) && !l.websiteUrl.toLowerCase().includes(q)) return false
      return true
    })
  }, [leads, tab, search])

  const allIds = filtered.map((l) => l.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id))

  function toggleAll() {
    if (allSelected) {
      setSelected((p) => { const n = new Set(p); allIds.forEach((id) => n.delete(id)); return n })
    } else {
      setSelected((p) => new Set([...p, ...allIds]))
    }
  }

  function toggleOne(id: string) {
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const selectedEmails = filtered
    .filter((l) => selected.has(l.id) && l.email)
    .map((l) => l.email!)

  function copyEmails() {
    navigator.clipboard.writeText(selectedEmails.join("\n"))
  }

  async function deleteSelected() {
    if (!confirm(`Удалить ${selected.size} записей? Это действие необратимо.`)) return
    setDeleting(true)
    try {
      await fetch("/api/admin/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected] }),
      })
      setSelected(new Set())
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  async function deleteOne(id: string) {
    if (!confirm("Удалить эту запись?")) return
    await fetch("/api/admin/leads", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    })
    router.refresh()
  }

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all",         label: "Все",              count: leads.length },
    { key: "unconverted", label: "Не купили",         count: leads.filter((l) => !l.converted && l.email).length },
    { key: "no_email",   label: "Без email",          count: leads.filter((l) => !l.email).length },
    { key: "converted",  label: "Конвертировались",   count: leads.filter((l) => l.converted).length },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-[#E5E5E1] pb-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(new Set()) }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-[#E5E5E1] text-[#0F1115]"
                : "border-transparent text-[#6A6D75] hover:text-[#0F1115]"
            }`}
          >
            {t.label}
            <span className={`ml-2 text-xs font-mono ${tab === t.key ? "text-[#6A6D75]" : "text-[#6A6D75]"}`}>
              {t.count}
            </span>
          </button>
        ))}
        <div className="ml-auto pb-2">
          <input
            type="text"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#F2F1EB] border border-[#E5E5E1] rounded-lg px-3 py-1.5 text-sm text-[#0F1115] placeholder-[#6A6D75] focus:outline-none focus:border-[#E5E5E1] w-48"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-[#6A6D75] border-b border-[#E5E5E1]">
              <th className="pb-3 pr-3 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="w-4 h-4 rounded border-[#E5E5E1] bg-[#F2F1EB] accent-[#E5E5E1] cursor-pointer" />
              </th>
              <th className="pb-3 pr-4 font-medium">Сайт / Компания</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">Score</th>
              <th className="pb-3 pr-4 font-medium">Письма</th>
              <th className="pb-3 pr-4 font-medium">Статус</th>
              <th className="pb-3 pr-4 font-medium">Дата</th>
              <th className="pb-3 w-8" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              const isSelected = selected.has(lead.id)
              const domain = (() => { try { return new URL(lead.websiteUrl).hostname.replace(/^www\./, "") } catch { return lead.websiteUrl } })()
              return (
                <tr key={lead.id} className={`group border-b border-[#E5E5E1]/40 transition-colors ${isSelected ? "bg-[#F2F1EB]/25" : "hover:bg-[#F2F1EB]/20"}`}>
                  <td className="py-3 pr-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(lead.id)}
                      className="w-4 h-4 rounded border-[#E5E5E1] bg-[#F2F1EB] accent-[#E5E5E1] cursor-pointer" />
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-[#0F1115] font-medium leading-tight">{lead.companyName}</p>
                    <p className="text-[#6A6D75] text-xs mt-0.5">{domain}</p>
                  </td>
                  <td className="py-3 pr-4">
                    {lead.email ? (
                      <span className="text-[#6A6D75] font-mono text-xs">{lead.email}</span>
                    ) : (
                      <span className="text-[#6A6D75] text-xs italic">не оставил</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center justify-center w-10 h-7 rounded-md text-xs font-bold font-mono ${SCORE_BG(lead.score)} ${SCORE_CLS(lead.score)}`}>
                      {lead.score}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {lead.emailSequence ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#6A6D75] text-xs">{lead.emailSequence.sent} отпр.</span>
                        {lead.emailSequence.opened && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">открыл</span>
                        )}
                        {lead.emailSequence.clicked && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-violet-50 text-violet-700">кликнул</span>
                        )}
                        {!lead.emailSequence.opened && (
                          <span className="text-xs text-[#6A6D75]">—</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[#6A6D75] text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {lead.converted ? (
                      <span className={`text-xs px-2 py-1 rounded-full ${lead.paid ? "bg-emerald-50 text-emerald-700" : "bg-[#C8F24A] text-[#4C6218]"}`}>
                        {lead.paid ? "Оплатил" : "Заявка"}
                      </span>
                    ) : lead.email ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-[#F2F1EB] text-[#6A6D75]">
                        Не купил
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-white text-[#6A6D75]">
                        Анон
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-[#6A6D75] text-xs">
                    {new Date(lead.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => deleteOne(lead.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#6A6D75] hover:text-red-700 transition-all text-base leading-none px-1"
                      title="Удалить"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-[#6A6D75] py-10 text-sm">Ничего не найдено</p>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#F2F1EB] border border-[#E5E5E1] rounded-xl px-5 py-3 shadow-2xl">
          <span className="text-sm text-[#0F1115]">
            Выбрано: <span className="font-bold text-[#0F1115]">{selected.size}</span>
          </span>
          <button onClick={() => setSelected(new Set())} className="text-sm text-[#6A6D75] hover:text-[#0F1115] transition-colors">
            Снять
          </button>
          <button
            onClick={copyEmails}
            className="px-4 py-1.5 bg-[#F2F1EB] hover:bg-[#F2F1EB] text-[#0F1115] text-sm rounded-lg transition-colors"
          >
            Скопировать email
          </button>
          <a
            href={`/api/admin/leads/retargeting?segment=unconverted`}
            className="px-4 py-1.5 bg-[#C8F24A] hover:bg-[#B9E437] text-[#0F1115] text-sm font-semibold rounded-lg transition-colors"
          >
            ↓ CSV для ретаргетинга
          </a>
          <button
            onClick={deleteSelected}
            disabled={deleting}
            className="px-4 py-1.5 bg-red-50 hover:bg-red-50 disabled:opacity-50 text-red-700 text-sm font-semibold rounded-lg transition-colors"
          >
            {deleting ? "Удаляем…" : "Удалить"}
          </button>
        </div>
      )}
    </div>
  )
}
