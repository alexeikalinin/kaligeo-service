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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 text-base">
      <header className="border-b border-zinc-800 px-8 py-5 flex items-center gap-8">
        <Link href="/admin" className="text-base font-bold tracking-widest text-zinc-100">
          KALIGEO
        </Link>
        <nav className="flex gap-6 text-base text-zinc-400">
          <Link href="/admin" className="hover:text-zinc-100 transition-colors">
            Задания
          </Link>
          <Link href="/admin/submit" className="hover:text-zinc-100 transition-colors">
            Новый аудит
          </Link>
          <Link href="/admin/clients" className="hover:text-zinc-100 transition-colors">
            Клиенты
          </Link>
          <Link href="/admin/usage" className="hover:text-zinc-100 transition-colors">
            Лимиты
          </Link>
        </nav>
        <div className="ml-auto">
          <Link href="/chat" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            → Чат
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-8 py-10">{children}</main>
    </div>
  )
}
