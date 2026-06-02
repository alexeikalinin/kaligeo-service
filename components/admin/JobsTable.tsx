"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT:    { label: "Ждёт оплаты", cls: "bg-yellow-900/30 text-yellow-400" },
  PENDING:            { label: "В очереди",   cls: "bg-zinc-700 text-zinc-400" },
  GENERATING_QUERIES: { label: "Запросы",     cls: "bg-blue-900/30 text-blue-400" },
  EXECUTING_QUERIES:  { label: "Опрос AI",    cls: "bg-blue-900/30 text-blue-400" },
  ANALYZING:          { label: "Анализ",      cls: "bg-purple-900/30 text-purple-400" },
  GENERATING_REPORT:  { label: "Отчёт",       cls: "bg-amber-900/30 text-amber-400" },
  DELIVERING:         { label: "Отправка",    cls: "bg-amber-900/30 text-amber-400" },
  COMPLETED:          { label: "Готово",      cls: "bg-emerald-900/30 text-emerald-400" },
  FAILED:             { label: "Ошибка",      cls: "bg-red-900/30 text-red-400" },
}

const STATUS_FILTER_OPTIONS = [
  { value: "", label: "Все статусы" },
  { value: "PENDING_PAYMENT", label: "Ждёт оплаты" },
  { value: "PENDING,GENERATING_QUERIES,EXECUTING_QUERIES,ANALYZING,GENERATING_REPORT,DELIVERING", label: "В работе" },
  { value: "COMPLETED", label: "Завершено" },
  { value: "FAILED", label: "Ошибка" },
]

const TIER_OPTIONS = [
  { value: "", label: "Все тарифы" },
  { value: "BASIC", label: "BASIC" },
  { value: "STANDARD", label: "STANDARD" },
  { value: "ADVANCED", label: "ADVANCED" },
]

function scoreColor(score: number | null) {
  if (score === null) return "text-zinc-600"
  if (score >= 60) return "text-emerald-400"
  if (score >= 30) return "text-amber-400"
  return "text-red-400"
}

type SortField = "company" | "date" | "score" | "tier" | null
type SortDir = "asc" | "desc"

type Job = {
  id: string
  companyName: string
  clientEmail: string
  tier: string
  status: string
  paidAt: Date | null
  createdAt: Date
  report: { overallScore: number | null } | null
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (current !== field) return <span className="ml-1 text-zinc-700 text-xs">⇅</span>
  return <span className="ml-1 text-zinc-300 text-xs">{dir === "asc" ? "↑" : "↓"}</span>
}

export function JobsTable({ jobs }: { jobs: Job[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [tierFilter, setTierFilter] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDir("desc")
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const statuses = statusFilter ? statusFilter.split(",") : null

    let rows = jobs.filter((job) => {
      if (q && !job.companyName.toLowerCase().includes(q) && !job.clientEmail.toLowerCase().includes(q)) return false
      if (statuses && !statuses.includes(job.status)) return false
      if (tierFilter && job.tier !== tierFilter) return false
      return true
    })

    if (sortField) {
      rows = [...rows].sort((a, b) => {
        let va: string | number = 0
        let vb: string | number = 0
        if (sortField === "company") { va = a.companyName.toLowerCase(); vb = b.companyName.toLowerCase() }
        if (sortField === "date") { va = new Date(a.createdAt).getTime(); vb = new Date(b.createdAt).getTime() }
        if (sortField === "score") { va = a.report?.overallScore ?? -1; vb = b.report?.overallScore ?? -1 }
        if (sortField === "tier") { va = a.tier; vb = b.tier }
        if (va < vb) return sortDir === "asc" ? -1 : 1
        if (va > vb) return sortDir === "asc" ? 1 : -1
        return 0
      })
    }

    return rows
  }, [jobs, search, statusFilter, tierFilter, sortField, sortDir])

  const allFilteredIds = filtered.map((j) => j.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id))
  const someSelected = selected.size > 0

  function toggleAll() {
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); allFilteredIds.forEach((id) => n.delete(id)); return n })
    } else {
      setSelected((prev) => new Set([...prev, ...allFilteredIds]))
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleBulkDelete() {
    if (!confirm(`Удалить ${selected.size} заявок? Это действие необратимо.`)) return
    setIsDeleting(true)
    try {
      const res = await fetch("/api/admin/jobs/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      })
      if (!res.ok) throw new Error("Failed")
      setSelected(new Set())
      startTransition(() => router.refresh())
    } catch {
      alert("Ошибка при удалении")
    } finally {
      setIsDeleting(false)
    }
  }

  function resetFilters() {
    setSearch("")
    setStatusFilter("")
    setTierFilter("")
  }

  const hasFilters = search || statusFilter || tierFilter

  function thClass(field: SortField) {
    return `pb-4 pr-6 font-medium cursor-pointer select-none hover:text-zinc-300 transition-colors ${sortField === field ? "text-zinc-300" : "text-zinc-500"}`
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Поиск по компании или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-zinc-500"
        >
          {TIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={resetFilters} className="px-3 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Сбросить
          </button>
        )}
        <span className="text-sm text-zinc-600 whitespace-nowrap">
          {filtered.length} из {jobs.length}
        </span>
        <a
          href="/api/admin/export?format=csv"
          className="ml-auto px-3 py-2 text-xs text-zinc-400 border border-zinc-700 rounded-lg hover:text-zinc-200 hover:border-zinc-500 transition-colors whitespace-nowrap"
        >
          ↓ CSV
        </a>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-sm border-b border-zinc-800">
              <th className="pb-4 pr-3 font-medium w-8 text-zinc-500">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400 cursor-pointer"
                />
              </th>
              <th className={thClass("company")} onClick={() => toggleSort("company")}>
                Компания<SortIcon field="company" current={sortField} dir={sortDir} />
              </th>
              <th className="pb-4 pr-6 font-medium text-zinc-500">Email</th>
              <th className={thClass("tier")} onClick={() => toggleSort("tier")}>
                Тариф<SortIcon field="tier" current={sortField} dir={sortDir} />
              </th>
              <th className="pb-4 pr-6 font-medium text-zinc-500">Статус</th>
              <th className="pb-4 pr-6 font-medium text-zinc-500">Оплата</th>
              <th className={thClass("score")} onClick={() => toggleSort("score")}>
                Score<SortIcon field="score" current={sortField} dir={sortDir} />
              </th>
              <th className={thClass("date")} onClick={() => toggleSort("date")}>
                Дата<SortIcon field="date" current={sortField} dir={sortDir} />
              </th>
              <th className="pb-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => {
              const cfg = STATUS_CONFIG[job.status] ?? STATUS_CONFIG.PENDING
              const score = job.report?.overallScore ?? null
              const date = new Date(job.createdAt).toLocaleDateString("ru-RU")
              const isSelected = selected.has(job.id)
              return (
                <tr
                  key={job.id}
                  className={`border-b border-zinc-800/50 transition-colors ${isSelected ? "bg-zinc-700/30" : "hover:bg-zinc-800/20"}`}
                >
                  <td className="py-4 pr-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(job.id)}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-zinc-400 cursor-pointer"
                    />
                  </td>
                  <td className="py-4 pr-6 text-zinc-200 font-medium">{job.companyName}</td>
                  <td className="py-4 pr-6 text-zinc-400 text-sm">{job.clientEmail}</td>
                  <td className="py-4 pr-6 text-zinc-400 text-sm">{job.tier}</td>
                  <td className="py-4 pr-6">
                    <span className={`text-sm px-3 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                  </td>
                  <td className="py-4 pr-6 text-sm">
                    {job.paidAt
                      ? <span className="text-emerald-400">✓ {new Date(job.paidAt).toLocaleDateString("ru-RU")}</span>
                      : <span className="text-yellow-600">—</span>
                    }
                  </td>
                  <td className={`py-4 pr-6 font-mono font-bold text-lg ${scoreColor(score)}`}>
                    {score ?? "—"}
                  </td>
                  <td className="py-4 pr-6 text-zinc-400 text-sm">{date}</td>
                  <td className="py-4">
                    <Link href={`/admin/jobs/${job.id}`} className="text-base text-zinc-400 hover:text-zinc-200 transition-colors">→</Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <p className="text-center text-zinc-600 py-10 text-sm">Ничего не найдено</p>
        )}
      </div>

      {/* Floating bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-zinc-800 border border-zinc-700 rounded-xl px-5 py-3 shadow-2xl">
          <span className="text-sm text-zinc-300">
            Выбрано: <span className="font-bold text-zinc-100">{selected.size}</span>
          </span>
          <button onClick={() => setSelected(new Set())} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            Снять
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting || isPending}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {isDeleting ? "Удаление..." : "Удалить выбранные"}
          </button>
        </div>
      )}
    </div>
  )
}
