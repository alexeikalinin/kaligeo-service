import "./review.css"
import Link from "next/link"
import { AuditFailureNotice } from "@/components/audit-failure-notice"
import type { QuestionCard } from "@/lib/questions/question-cards"
import type { BusinessMap } from "@/lib/questions/business-map"
import { prisma } from "@/lib/prisma"
import MapEditor from "./map-editor"
import Editor from "./editor"
import ReviewWorkspace from "./review-workspace"

export default async function QuestionReviewPage() {
  const jobs = await prisma.auditJob.findMany({ where: { status: { in: ["GENERATING_QUERIES", "FAILED"] } }, orderBy: { createdAt: "asc" } })
  const pendingMaps = jobs.filter(job => ((job.analysisSnapshot as Record<string, unknown> | null)?.businessMapReview as { state?: string } | undefined)?.state === "pending").length
  return <div className="review-dashboard space-y-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#3A4A13]">Контроль качества аудитов</p><h1 className="mt-2 text-3xl font-semibold">Проверка вопросов</h1><p className="mt-3 max-w-2xl text-sm text-[#6A6D75]">Сначала согласуйте бизнес и аудитории. Затем проверьте вопросы. Опрос ИИ начнётся только после утверждения списка вопросов.</p></div><div className="flex gap-3 text-sm"><span className="rounded-lg border border-[#E5E5E1] px-4 py-3">Карты на проверке <strong className="ml-2 text-[#3A4A13]">{pendingMaps}</strong></span><span className="rounded-lg border border-[#E5E5E1] px-4 py-3">Ошибки <strong className="ml-2 text-red-700">{jobs.filter(j => j.status === "FAILED").length}</strong></span></div></header>
    {!jobs.length && <div className="rounded-xl border border-[#E5E5E1] p-8 text-[#6A6D75]">Нет аудитов, ожидающих проверки.</div>}
    {jobs.map(job => {
      const snapshot = (job.analysisSnapshot ?? {}) as Record<string, unknown>
      const review = snapshot.questionReview as { hash: string; notes?: string; state: string } | undefined
      const mapReview = snapshot.businessMapReview as { state: string; hash: string; notes?: string } | undefined
      return <section key={job.id} className="space-y-5">
        <div className="flex flex-wrap justify-between gap-3 border-b border-[#E5E5E1] pb-4"><div><h2 className="text-2xl font-semibold">{job.companyName} <span className="ml-2 rounded-md bg-[#F2F1EB] px-2 py-1 text-xs font-normal">{job.tier}</span></h2><a href={job.websiteUrl} target="_blank" rel="noreferrer" className="mt-2 block text-sm text-[#6A6D75] underline">{job.websiteUrl}</a></div><Link className="self-center text-sm text-[#6A6D75] underline" href={`/admin/jobs/${job.id}`}>Открыть задание</Link></div>
        {job.status === "FAILED" && <div className="rounded-xl border border-red-200 bg-red-50 p-4"><AuditFailureNotice message={job.errorMessage}/></div>}
        <ReviewWorkspace jobId={job.id} mapApproved={mapReview?.state==="approved"} questionsReady={!!review&&["pending","approved"].includes(review.state)} failed={job.status==="FAILED"} startedAt={(snapshot.questionPreparation as {queuedAt?:string}|undefined)?.queuedAt}
          mapPanel={snapshot.businessMap&&mapReview?<MapEditor id={job.id} initial={snapshot.businessMap as BusinessMap} version={mapReview.hash} initialNotes={mapReview.notes??""}/>:<p className="text-sm text-[#6A6D75]">Карта бизнеса ещё не подготовлена.</p>}
          questionsPanel={review?<div className="rounded-xl border border-[#E5E5E1] p-5 space-y-4"><h3 className="text-xl font-semibold">Проверка вопросов</h3><p className="text-sm text-[#6A6D75]">{review.state==="approved"?"Список утверждён.":"Вопросы подготовлены по выбранной аудитории. Проверьте формулировки перед опросом ИИ."}</p><Editor id={job.id} queries={(job.generatedQueries??[]) as string[]} version={review.hash} initialNotes={review.notes??""} initialCards={(snapshot.questionCards??[]) as QuestionCard[]}/></div>:null}/>

      </section>
    })}
  </div>
}
