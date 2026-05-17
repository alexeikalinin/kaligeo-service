import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"

export const metadata = {
  title: "Dashboard — KaliGEO",
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN

  if (!isAuthed) {
    redirect("/admin/login")
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bone)", color: "var(--ink)" }}>
      <header
        className="flex items-center gap-6 px-6 py-4 border-b"
        style={{ borderColor: "var(--rule)" }}
      >
        <Link
          href="/dashboard"
          className="font-mono text-xs font-bold tracking-widest uppercase"
          style={{ color: "var(--ink)" }}
        >
          KaliGEO
        </Link>
        <nav className="flex gap-4 text-sm" style={{ color: "var(--ink-3)" }}>
          <Link
            href="/dashboard"
            className="transition-colors hover:text-[var(--ink)]"
          >
            Dashboard
          </Link>
          <Link
            href="/dashboard/leads"
            className="transition-colors hover:text-[var(--ink)]"
          >
            Leads
          </Link>
          <Link
            href="/admin"
            className="transition-colors hover:text-[var(--ink)]"
          >
            Admin
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/chat"
            className="text-xs px-3 py-1.5 rounded font-medium transition-colors"
            style={{
              background: "var(--accent)",
              color: "var(--accent-ink)",
            }}
          >
            + Новый аудит
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
