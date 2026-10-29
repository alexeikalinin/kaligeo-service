"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
export default function AdminShell({children}:{children:React.ReactNode}) {
 const light=usePathname().startsWith("/admin/question-review")
 return (
    <div className={light ? "admin-review-shell min-h-screen bg-[#FAFAF7] text-[#0F1115] text-base" : "min-h-screen bg-zinc-950 text-zinc-100 text-base"}>
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
