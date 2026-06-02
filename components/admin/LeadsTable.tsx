"use client"

import { useState, useMemo } from "react"

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
  s >= 60 ? "text-emerald-400" : s >= 40 ? "text-amber-400" : "text-red-400"

const SCORE_BG = (s: number) =>
  s >= 60 ? "bg-emerald-900/30" : s >= 40 ? "bg-amber-900/20" : "bg-red-900/20"

export function LeadsTable({ leads }: { leads: LeadRow[] }) {
  const [tab, setTab] = useState<Tab>("unconverted")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())

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

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "all",         label: "Все",              count: leads.length },
    { key: "unconverted", label: "Не купили",         count: leads.filter((l) => !l.converted && l.email).length },
    { key: "no_email",   label: "Без email",          count: leads.filter((l) => !l.email).length },
    { key: "converted",  label: "Конвертировались",   count: leads.filter((l) => l.converted).length },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-zinc-800 pb-0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(new Set()) }}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.key
                ? "border-zinc-100 text-zinc-100"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
            <span className={`ml-2 text-xs font-mono ${tab === t.key ? "text-zinc-400" : "text-zinc-600"}`}>
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
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 w-48"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-zinc-500 border-b border-zinc-800">
              <th className="pb-3 pr-3 w-8">
                <input type="checkbox" checked={allSelected} onChange={toggleAll}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400 cursor-pointer" />
              </th>
              <th className="pb-3 pr-4 font-medium">Сайт / Компания</th>
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">Score</th>
              <th className="pb-3 pr-4 font-medium">Письма</th>
              <th className="pb-3 pr-4 font-medium">Статус</th>
              <th className="pb-3 font-medium">Дата</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => {
              const isSelected = selected.has(lead.id)
              const domain = (() => { try { return new URL(lead.websiteUrl).hostname.replace(/^www\./, "") } catch { return lead.websiteUrl } })()
              return (
                <tr key={lead.id} className={`border-b border-zinc-800/40 transition-colors ${isSelected ? "bg-zinc-700/25" : "hover:bg-zinc-800/20"}`}>
                  <td className="py-3 pr-3">
                    <input type="checkbox" checked={isSelected} onChange={() => toggleOne(lead.id)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400 cursor-pointer" />
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-zinc-200 font-medium leading-tight">{lead.companyName}</p>
                    <p className="text-zinc-600 text-xs mt-0.5">{domain}</p>
                  </td>
                  <td className="py-3 pr-4">
                    {lead.email ? (
                      <span className="text-zinc-400 font-mono text-xs">{lead.email}</span>
                    ) : (
                      <span className="text-zinc-700 text-xs italic">не оставил</span>
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
                        <span className="text-zinc-500 text-xs">{lead.emailSequence.sent} отпр.</span>
                        {lead.emailSequence.opened && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400">открыл</span>
                        )}
                        {lead.emailSequence.clicked && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-400">кликнул</span>
                        )}
                        {!lead.emailSequence.opened && (
                          <span className="text-xs text-zinc-700">—</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    {lead.converted ? (
                      <span className={`text-xs px-2 py-1 rounded-full ${lead.paid ? "bg-emerald-900/30 text-emerald-400" : "bg-yellow-900/30 text-yellow-400"}`}>
                        {lead.paid ? "Оплатил" : "Заявка"}
                      </span>
                    ) : lead.email ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-500">
                        Не купил
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-zinc-900 text-zinc-700">
                        Анон
                      </span>
                    )}
                  </td>
                  <td className="py-3 text-zinc-600 text-xs">
                    {new Date(lead.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-zinc-700 py-10 text-sm">Ничего не найдено</p>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-800 border border-zinc-700 rounded-xl px-5 py-3 shadow-2xl">
          <span className="text-sm text-zinc-300">
            Выбрано: <span className="font-bold text-zinc-100">{selected.size}</span>
          </span>
          <button onClick={() => setSelected(new Set())} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Снять
          </button>
          <button
            onClick={copyEmails}
            className="px-4 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm rounded-lg transition-colors"
          >
            Скопировать email
          </button>
          <a
            href={`/api/admin/leads/retargeting?segment=unconverted`}
            className="px-4 py-1.5 bg-violet-700 hover:bg-violet-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            ↓ CSV для ретаргетинга
          </a>
        </div>
      )}
    </div>
  )
}
