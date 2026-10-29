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
      <header className="border-b border-zinc-800 px-4 sm:px-8 py-5 flex flex-wrap items-center gap-4 sm:gap-8">
        <Link href="/admin" className="text-base font-bold tracking-widest text-zinc-100">
          KALIGEO
        </Link>
        <Link href="/admin/question-review" className="text-amber-300">Проверка вопросов</Link>
        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-zinc-400">
          <Link href="/admin" className="hover:text-zinc-100 transition-colors">
            Задания
          </Link>
          <Link href="/admin/submit" className="hover:text-zinc-100 transition-colors">
            Новый аудит
          </Link>
          <Link href="/admin/leads" className="hover:text-zinc-100 transition-colors">
            Лиды
          </Link>
          <Link href="/admin/clients" className="hover:text-zinc-100 transition-colors">
            Клиенты
          </Link>
          <Link href="/admin/usage" className="hover:text-zinc-100 transition-colors">
            Лимиты
          </Link>
          <Link href="/admin/funnel" className="hover:text-zinc-100 transition-colors">
            Аналитика
          </Link>
          <Link href="/admin/agents" className="hover:text-zinc-100 transition-colors">
            Агенты
          </Link>
        </nav>
        <div className="ml-auto">
          <Link href="/chat" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            → Чат
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">{children}</main>
    </div>
  )
}
