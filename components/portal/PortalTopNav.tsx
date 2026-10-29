"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

interface Props {
  client: { id: string; email: string; companyName: string }
}

export default function PortalTopNav({ client }: Props) {
  const pathname = usePathname()
  useEffect(()=>{document.documentElement.removeAttribute("data-theme")},[])

  function isActive(path: string) {
    return pathname?.startsWith(path)
  }

  async function handleLogout() {
    await fetch("/api/client/auth/logout", { method: "POST" })
    window.location.href = "/my/login"
  }

  return (
    <header
      style={{
        borderBottom: "1px solid var(--rule)",
        background: "var(--bone)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap items-center gap-4">
        <Link
          href="/my/dashboard"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          KaliGEO
        </Link>

        <nav className="flex flex-wrap items-center gap-3">
          <NavLink href="/my/dashboard" active={isActive("/my/dashboard")}>
            Обзор
          </NavLink>
          <NavLink href="/my/history" active={isActive("/my/history")}>
            История
          </NavLink>
          <NavLink href="/my/brands" active={isActive("/my/brands")}>
            Бренды
          </NavLink>
          <NavLink href="/my/sources" active={isActive("/my/sources")}>
            Источники
          </NavLink>
          <NavLink href="/my/billing" active={isActive("/my/billing")}>
            Биллинг
          </NavLink>
          <NavLink href="/my/settings" active={isActive("/my/settings")}>
            Настройки
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span
            style={{
              fontSize: "13px",
              color: "var(--ink-3)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {client.email}
          </span>
          <button
            onClick={handleLogout}
            style={{
              fontSize: "12px",
              color: "var(--ink-3)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "var(--radius-sm)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--ink)"
              e.currentTarget.style.background = "var(--bone-2)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--ink-3)"
              e.currentTarget.style.background = "none"
            }}
          >
            Выйти
          </button>
        </div>
      </div>
    </header>
  )
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      style={{
        fontSize: "14px",
        color: active ? "var(--ink)" : "var(--ink-3)",
        fontWeight: active ? 600 : 400,
        textDecoration: "none",
        background: active ? "var(--accent)" : "transparent",
        borderRadius: "var(--radius-md)",
        padding: "8px 10px",
        paddingBottom: "2px",
        transition: "color 0.15s",
      }}
    >
      {children}
    </Link>
  )
}
