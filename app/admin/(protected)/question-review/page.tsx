import Link from "next/link"
import { AuditFailureNotice } from "@/components/audit-failure-notice"
import type { QuestionCard } from "@/lib/questions/question-cards"
import type { BusinessMap } from "@/lib/questions/business-map"
import { prisma } from "@/lib/prisma"
import MapEditor from "./map-editor"
import Editor from "./editor"

export default async function QuestionReviewPage() {
  const jobs = await prisma.auditJob.findMany({ where: { status: { in: ["GENERATING_QUERIES", "FAILED"] } }, orderBy: { createdAt: "asc" } })
  const pendingMaps = jobs.filter(job => ((job.analysisSnapshot as Record<string, unknown> | null)?.businessMapReview as { state?: string } | undefined)?.state === "pending").length
  return <div className="space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-amber-200">Контроль качества аудитов</p><h1 className="mt-2 text-3xl font-semibold">Проверка вопросов</h1><p className="mt-3 max-w-2xl text-sm text-zinc-400">Сначала согласуйте бизнес и аудитории. Затем проверьте вопросы. Опрос ИИ начнётся только после утверждения списка вопросов.</p></div><div className="flex gap-3 text-sm"><span className="rounded-lg border border-zinc-800 px-4 py-3">Карты на проверке <strong className="ml-2 text-amber-200">{pendingMaps}</strong></span><span className="rounded-lg border border-zinc-800 px-4 py-3">Ошибки <strong className="ml-2 text-red-300">{jobs.filter(j => j.status === "FAILED").length}</strong></span></div></header>
    {!jobs.length && <div className="rounded-xl border border-zinc-800 p-8 text-zinc-400">Нет аудитов, ожидающих проверки.</div>}
    {jobs.map(job => {
      const snapshot = (job.analysisSnapshot ?? {}) as Record<string, unknown>
      const review = snapshot.questionReview as { hash: string; notes?: string; state: string } | undefined
      const mapReview = snapshot.businessMapReview as { state: string; hash: string; notes?: string } | undefined
      const pendingMap = mapReview?.state === "pending" && snapshot.businessMap
      if (!pendingMap && !review && job.status !== "FAILED") return <section key={job.id} className="rounded-xl border border-zinc-800 p-6"><h2 className="text-xl">{job.companyName}</h2><p className="mt-2 text-sm text-zinc-400">Подготовка вопросов выполняется. Обновите страницу через некоторое время.</p></section>
      return <section key={job.id} className="space-y-5">
        <div className="flex flex-wrap justify-between gap-3 border-b border-zinc-800 pb-4"><div><h2 className="text-2xl font-semibold">{job.companyName} <span className="ml-2 rounded-md bg-zinc-800 px-2 py-1 text-xs font-normal">{job.tier}</span></h2><a href={job.websiteUrl} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-zinc-400 underline">{job.websiteUrl}</a></div><Link className="self-center text-sm text-zinc-400 underline" href={`/admin/jobs/${job.id}`}>Открыть задание</Link></div>
        {job.status === "FAILED" && <div className="rounded-xl border border-red-900 bg-red-950/20 p-4"><AuditFailureNotice message={job.errorMessage}/></div>}
        {pendingMap && mapReview ? <MapEditor id={job.id} initial={snapshot.businessMap as BusinessMap} version={mapReview.hash} initialNotes={mapReview.notes ?? ""}/> : review && ["pending", "approved"].includes(review.state) ? <div className="rounded-xl border border-zinc-800 p-5 space-y-4"><h3 className="text-xl font-semibold">Шаг 2. Проверка вопросов</h3><p className="text-sm text-zinc-400">{review.state === "approved" ? "Список утверждён. При сбое постановки в очередь можно повторить запуск." : "Карта утверждена, вопросы подготовлены. Проверьте формулировки перед опросом ИИ."}</p><details className="text-sm text-zinc-400"><summary className="cursor-pointer">Контекст и уведомления</summary><p className="mt-3">{job.niche}</p><p>{String(snapshot.description ?? "")}</p><p>{String(snapshot.targetAudience ?? "")}</p><pre className="mt-3 overflow-auto text-xs">{JSON.stringify(snapshot.reviewNotifications ?? "Уведомлений пока нет", null, 2)}</pre></details><Editor failed={job.status === "FAILED"} id={job.id} queries={(job.generatedQueries ?? []) as string[]} version={review.hash} initialNotes={review.notes ?? ""} initialCards={(snapshot.questionCards ?? []) as QuestionCard[]}/></div> : null}
      </section>
    })}
  </div>
}
