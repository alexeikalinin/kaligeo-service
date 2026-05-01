import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN

  if (!isAuthed) {
    redirect("/admin/login")
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-6">
        <Link href="/admin" className="text-sm font-bold tracking-wider text-zinc-100">
          KALIGEO
        </Link>
        <nav className="flex gap-4 text-sm text-zinc-500">
          <Link href="/admin" className="hover:text-zinc-300 transition-colors">
            Задания
          </Link>
          <Link href="/admin/submit" className="hover:text-zinc-300 transition-colors">
            Новый аудит
          </Link>
        </nav>
        <div className="ml-auto">
          <Link href="/chat" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            → Чат
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
