"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

interface NicheEntry {
  label: string
  full: string
  count: number
}

interface NicheSidebarProps {
  niches: NicheEntry[]
  total: number
}

export function NicheSidebar({ niches, total }: NicheSidebarProps) {
  const params = useSearchParams()
  const active = params.get("niche") ?? ""

  return (
    <nav className="w-56 shrink-0 border-r border-[var(--rule)] pr-6">
      <p className="t-eyebrow mb-4">Ниши</p>
      <ul className="space-y-0.5">
        <li>
          <Link
            href="/dashboard"
            className={`flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
              active === ""
                ? "bg-[var(--ink)] text-[var(--bone)]"
                : "text-[var(--ink-2)] hover:bg-[var(--bone-2)] hover:text-[var(--ink)]"
            }`}
          >
            <span>Все аудиты</span>
            <span className="font-mono text-xs opacity-60">{total}</span>
          </Link>
        </li>
        {niches.map((n) => (
          <li key={n.full}>
            <Link
              href={`/dashboard?niche=${encodeURIComponent(n.full)}`}
              className={`flex items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                active === n.full
                  ? "bg-[var(--ink)] text-[var(--bone)]"
                  : "text-[var(--ink-2)] hover:bg-[var(--bone-2)] hover:text-[var(--ink)]"
              }`}
            >
              <span className="truncate mr-2">{n.label}</span>
              <span className="font-mono text-xs opacity-60 shrink-0">{n.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
