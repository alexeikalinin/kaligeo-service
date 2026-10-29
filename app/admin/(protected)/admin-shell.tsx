"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
export default function AdminShell({children}:{children:React.ReactNode}) {
 const pathname=usePathname()
 const links=[['/admin/question-review','Проверка вопросов'],['/admin','Задания'],['/admin/submit','Новый аудит'],['/admin/leads','Лиды'],['/admin/clients','Клиенты'],['/admin/usage','Лимиты'],['/admin/funnel','Аналитика'],['/admin/agents','Агенты']]
 return (
    <div className="admin-review-shell min-h-screen bg-[#FAFAF7] text-[#0F1115] text-base">
      <header className="border-b border-[#E5E5E1] px-4 sm:px-8 py-5 flex flex-wrap items-center gap-4 sm:gap-8">
        <Link href="/admin" className="text-base font-bold tracking-widest text-[#0F1115]">
          KALIGEO
        </Link>
        <nav aria-label="Разделы кабинета" className="flex flex-wrap gap-1 text-sm">
          {links.map(([href,label])=>{const active=href==='/admin'?(pathname==='/admin'||pathname.startsWith('/admin/jobs/')):pathname.startsWith(href);return <Link key={href} href={href} aria-current={active?'page':undefined} className={`rounded-lg px-3 py-2 transition-colors ${active?'bg-[#C8F24A] font-medium text-[#0F1115]':'text-[#6A6D75] hover:bg-[#F2F1EB] hover:text-[#0F1115]'}`}>{label}</Link>})}
        </nav>
        <div className="ml-auto">
          <Link href="/chat" className="text-sm text-[#6A6D75] hover:text-[#0F1115] transition-colors">
            → Чат
          </Link>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">{children}</main>
    </div>
 )
}
