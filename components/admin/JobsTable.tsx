"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING_PAYMENT:    { label: "Ждёт оплаты", cls: "bg-[#C8F24A] text-[#4C6218]" },
  PENDING:            { label: "В очереди",   cls: "bg-[#F2F1EB] text-[#6A6D75]" },
  GENERATING_QUERIES: { label: "Запросы",     cls: "bg-blue-50 text-blue-700" },
  EXECUTING_QUERIES:  { label: "Опрос AI",    cls: "bg-blue-50 text-blue-700" },
  ANALYZING:          { label: "Анализ",      cls: "bg-purple-50 text-purple-700" },
  GENERATING_REPORT:  { label: "Отчёт",       cls: "bg-[#C8F24A] text-[#4C6218]" },
  DELIVERING:         { label: "Отправка",    cls: "bg-[#C8F24A] text-[#4C6218]" },
  COMPLETED:          { label: "Готово",      cls: "bg-emerald-50 text-emerald-700" },
  FAILED:             { label: "Ошибка",      cls: "bg-red-50 text-red-700" },
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
  if (score === null) return "text-[#6A6D75]"
  if (score >= 60) return "text-emerald-700"
  if (score >= 30) return "text-[#4C6218]"
  return "text-red-700"
}

type SortField = "company" | "date" | "score" | "tier" | null
type SortDir = "asc" | "desc"

type Job = {
  id: string
  companyName: string
  clientEmail: string
  tier: string
  status: string
  market: string
  paidAt: Date | null
  createdAt: Date
  report: { overallScore: number | null } | null
}

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (current !== field) return <span className="ml-1 text-[#6A6D75] text-xs">⇅</span>
  return <span className="ml-1 text-[#0F1115] text-xs">{dir === "asc" ? "↑" : "↓"}</span>
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
    return `pb-4 pr-6 font-medium cursor-pointer select-none hover:text-[#0F1115] transition-colors ${sortField === field ? "text-[#0F1115]" : "text-[#6A6D75]"}`
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Поиск по компании или email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-[#F2F1EB] border border-[#E5E5E1] rounded-lg px-3 py-2 text-sm text-[#0F1115] placeholder-[#6A6D75] focus:outline-none focus:border-[#E5E5E1]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#F2F1EB] border border-[#E5E5E1] rounded-lg px-3 py-2 text-sm text-[#0F1115] focus:outline-none focus:border-[#E5E5E1]"
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="bg-[#F2F1EB] border border-[#E5E5E1] rounded-lg px-3 py-2 text-sm text-[#0F1115] focus:outline-none focus:border-[#E5E5E1]"
        >
          {TIER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {hasFilters && (
          <button onClick={resetFilters} className="px-3 py-2 text-sm text-[#6A6D75] hover:text-[#0F1115] transition-colors">
            Сбросить
          </button>
        )}
        <span className="text-sm text-[#6A6D75] whitespace-nowrap">
          {filtered.length} из {jobs.length}
        </span>
        <a
          href="/api/admin/export?format=csv"
          className="ml-auto px-3 py-2 text-xs text-[#6A6D75] border border-[#E5E5E1] rounded-lg hover:text-[#0F1115] hover:border-[#E5E5E1] transition-colors whitespace-nowrap"
        >
          ↓ CSV
        </a>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left text-sm border-b border-[#E5E5E1]">
              <th className="pb-4 pr-3 font-medium w-8 text-[#6A6D75]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-[#E5E5E1] bg-[#F2F1EB] accent-[#E5E5E1] cursor-pointer"
                />
              </th>
              <th className={thClass("company")} onClick={() => toggleSort("company")}>
                Компания<SortIcon field="company" current={sortField} dir={sortDir} />
              </th>
              <th className="pb-4 pr-6 font-medium text-[#6A6D75]">Email</th>
              <th className="pb-4 pr-6 font-medium text-[#6A6D75]">Домен</th>
              <th className={thClass("tier")} onClick={() => toggleSort("tier")}>
                Тариф<SortIcon field="tier" current={sortField} dir={sortDir} />
              </th>
              <th className="pb-4 pr-6 font-medium text-[#6A6D75]">Статус</th>
              <th className="pb-4 pr-6 font-medium text-[#6A6D75]">Оплата</th>
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
                  className={`border-b border-[#E5E5E1]/50 transition-colors ${isSelected ? "bg-[#F2F1EB]/30" : "hover:bg-[#F2F1EB]/20"}`}
                >
                  <td className="py-4 pr-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(job.id)}
                      className="w-4 h-4 rounded border-[#E5E5E1] bg-[#F2F1EB] accent-[#E5E5E1] cursor-pointer"
                    />
                  </td>
                  <td className="py-4 pr-6 text-[#0F1115] font-medium">{job.companyName}</td>
                  <td className="py-4 pr-6 text-[#6A6D75] text-sm">{job.clientEmail}</td>
                  <td className="py-4 pr-6 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-mono ${job.market === "by" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
                      {job.market === "by" ? "BY" : "RU"}
                    </span>
                  </td>
                  <td className="py-4 pr-6 text-[#6A6D75] text-sm">{job.tier}</td>
                  <td className="py-4 pr-6">
                    <span className={`text-sm px-3 py-1 rounded-full ${cfg.cls}`}>{cfg.label}</span>
                  </td>
                  <td className="py-4 pr-6 text-sm">
                    {job.paidAt
                      ? <span className="text-emerald-700">✓ {new Date(job.paidAt).toLocaleDateString("ru-RU")}</span>
                      : <span className="text-[#4C6218]">—</span>
                    }
                  </td>
                  <td className={`py-4 pr-6 font-mono font-bold text-lg ${scoreColor(score)}`}>
                    {score ?? "—"}
                  </td>
                  <td className="py-4 pr-6 text-[#6A6D75] text-sm">{date}</td>
                  <td className="py-4">
                    <Link href={`/admin/jobs/${job.id}`} className="text-sm text-[#6A6D75] hover:text-[#0F1115] underline">Задание</Link>{job.status === "COMPLETED" && job.report && <Link href={`/admin/jobs/${job.id}/report`} className="mt-2 block whitespace-nowrap rounded-lg bg-[#C8F24A] px-3 py-2 text-center text-sm font-medium text-[#0F1115]">Открыть отчёт</Link>}
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

      {/* Floating bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 bg-[#F2F1EB] border border-[#E5E5E1] rounded-xl px-5 py-3 shadow-2xl">
          <span className="text-sm text-[#0F1115]">
            Выбрано: <span className="font-bold text-[#0F1115]">{selected.size}</span>
          </span>
          <button onClick={() => setSelected(new Set())} className="text-sm text-[#6A6D75] hover:text-[#0F1115] transition-colors">
            Снять
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isDeleting || isPending}
            className="px-4 py-1.5 bg-red-100 hover:bg-red-200 disabled:opacity-50 text-[#0F1115] text-sm font-semibold rounded-lg transition-colors"
          >
            {isDeleting ? "Удаление..." : "Удалить выбранные"}
          </button>
        </div>
      )}
    </div>
  )
}
