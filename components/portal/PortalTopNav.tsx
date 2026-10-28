"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useSyncExternalStore } from "react"

interface Props {
  client: { id: string; email: string; companyName: string }
}

function subscribeTheme(listener:()=>void){window.addEventListener("storage",listener);window.addEventListener("kaligeo-theme",listener);return()=>{window.removeEventListener("storage",listener);window.removeEventListener("kaligeo-theme",listener)}}
const themeSnapshot=()=>localStorage.getItem("theme")==="dark"
const serverThemeSnapshot=()=>false

export default function PortalTopNav({ client }: Props) {
  const pathname = usePathname()
  const dark=useSyncExternalStore(subscribeTheme,themeSnapshot,serverThemeSnapshot)
  useEffect(()=>{document.documentElement.setAttribute("data-theme",dark?"dark":"")},[dark])
  function toggleTheme(){localStorage.setItem("theme",dark?"light":"dark");window.dispatchEvent(new Event("kaligeo-theme"))}

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
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-6">
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

        <nav className="flex items-center gap-5 ml-4">
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
          <button
            onClick={toggleTheme}
            title={dark ? "Светлая тема" : "Тёмная тема"}
            style={{
              fontSize: "15px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              lineHeight: 1,
              opacity: 0.6,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "1" }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6" }}
          >
            {dark ? "☀" : "☾"}
          </button>
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
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        paddingBottom: "2px",
        transition: "color 0.15s",
      }}
    >
      {children}
    </Link>
  )
}
