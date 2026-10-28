import { withInternalUsage } from "@/lib/analysis/internal-usage"
import { validateBudget } from "@/lib/analysis/ai-meter"
import { rewriteQuestions } from "@/lib/agents/question-rewrite-agent"
import { reviewFeedback } from "@/lib/questions/review-feedback"
import { reviewQuestions } from "@/lib/agents/question-review-agent"
import { cardsVersion,assertCardsApproved,type QuestionCard } from "@/lib/questions/question-cards"
import { validateBusinessMap } from "@/lib/questions/business-map"
import { tasks } from "@trigger.dev/sdk/v3"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getTierConfig, type Tier } from "@/lib/gates"
import { questionHash, validateQuestionSet } from "@/lib/questions/review"
export const maxDuration=180
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const secret = process.env.ADMIN_SESSION_TOKEN
  if (!secret || (await cookies()).get("admin_session")?.value !== secret) return NextResponse.json({error:"Unauthorized"},{status:401})
  const { id } = await params
  const body = await req.json().catch(()=>null)
  if (!body || !["save","approve","launch","review","regenerate","resume"].includes(body.action)) return NextResponse.json({error:"Invalid action"},{status:400})
  try {
    if(body.action==="review"||body.action==="regenerate"){
      const job=await prisma.auditJob.findUniqueOrThrow({where:{id}}),snapshot=(job.analysisSnapshot??{}) as Record<string,unknown>
      const queries=validateQuestionSet(job.generatedQueries,getTierConfig(job.tier as Tier).queryCount),map=validateBusinessMap(snapshot.businessMap)
      const old=snapshot.questionReview as {hash:string;state:string}|undefined
      if(job.status!=="GENERATING_QUERIES"||old?.state!=="pending"||old.hash!==body.version)throw Error("Сначала сохраните актуальный список")
      if(questionHash(validateQuestionSet(body.queries,queries.length))!==questionHash(queries))throw Error("Сначала сохраните правки")
      if(body.action==="regenerate"){
        if(!Array.isArray(body.indexes)||!String(body.notes??"").trim())throw Error("Выберите вопросы и укажите рекомендации")
        const replacement=validateQuestionSet(await withInternalUsage(id,"question-rewrite",()=>rewriteQuestions(queries,body.indexes,map,String(body.notes).slice(0,5000))),queries.length)
        const hash=questionHash(replacement),history=Array.isArray(snapshot.questionFeedback)?snapshot.questionFeedback:[]
        const changed=await prisma.auditJob.updateMany({where:{id,updatedAt:job.updatedAt},data:{generatedQueries:replacement,analysisSnapshot:JSON.parse(JSON.stringify({...snapshot,questionCards:null,questionCardsVersion:null,questionReview:{hash,state:"pending",notes:String(body.notes)},questionFeedback:[...history,{action:"regenerate",at:new Date().toISOString(),before:queries,after:replacement,notes:String(body.notes),indexes:body.indexes}]}))}})
        if(changed.count!==1)throw Error("Вопросы изменились во время переработки")
        return NextResponse.json({hash,queries:replacement,regenerated:true})
      }
      const cards=await withInternalUsage(id,"question-review",()=>reviewQuestions(queries,map,reviewFeedback(snapshot)))
      const changed=await prisma.auditJob.updateMany({where:{id,updatedAt:job.updatedAt},data:{analysisSnapshot:JSON.parse(JSON.stringify({...snapshot,questionCards:cards,questionCardsVersion:cardsVersion(queries,map)}))}})
      if(changed.count!==1)throw Error("Список изменился во время проверки")
      return NextResponse.json({hash:old.hash,cards,reviewed:true})
    }
    const result = await prisma.$transaction(async tx => {
      const job = await tx.auditJob.findUniqueOrThrow({where:{id}})
      const snapshot = (job.analysisSnapshot ?? {}) as Record<string, unknown>
      const old = snapshot.questionReview as { hash?: string; state?: string } | undefined
      if(body.action!=="save"){
        const map=validateBusinessMap(snapshot.businessMap)
        const saved=validateQuestionSet(job.generatedQueries,getTierConfig(job.tier as Tier).queryCount)
        if(snapshot.questionCardsVersion!==cardsVersion(saved,map))throw Error("Сначала повторите проверку изменённых вопросов")
        assertCardsApproved((snapshot.questionCards??[]) as QuestionCard[],saved,map)
      }
      if(body.action === "resume") {
        if(job.status!=="FAILED"||old?.state!=="approved"||old.hash!==body.version)throw Error("Нет неудачного утверждённого аудита для восстановления")
        const budget=validateBudget(body.budgetUsd)
        const changed=await tx.auditJob.updateMany({where:{id,updatedAt:job.updatedAt},data:{status:"GENERATING_QUERIES",errorMessage:null,aiBudgetUsd:budget}})
        if(changed.count!==1)throw Error("Аудит уже изменён")
        return {hash:old.hash,approved:true,validation:job.source==="qa-acceptance",dispatchVersion:String(job.updatedAt.getTime())}
      }
      if(body.action === "launch") {
        if(job.status !== "GENERATING_QUERIES" || old?.state !== "approved" || old.hash !== body.version) throw Error("Нет утверждённой версии для запуска")
        return {hash:old.hash,approved:true,validation:job.source === "qa-acceptance"}
      }
      if (job.status !== "GENERATING_QUERIES" || old?.state !== "pending" || old.hash !== body.version) throw Error("Список уже изменён или не ожидает проверки. Обновите страницу.")
      const queries = validateQuestionSet(body.queries,getTierConfig(job.tier as Tier).queryCount)
      const hash = questionHash(queries)
      // Approval requires a previously saved version, so edits never silently approve themselves.
      if (body.action === "approve" && hash !== old.hash) throw Error("Сначала сохраните правки, затем утвердите новую версию")
      const history = Array.isArray(snapshot.questionFeedback) ? snapshot.questionFeedback : []
      const changed = await tx.auditJob.updateMany({ where:{id,updatedAt:job.updatedAt},data:{
        ...(body.action==="approve"?{aiBudgetUsd:validateBudget(body.budgetUsd)}:{}),
        generatedQueries:queries,
        analysisSnapshot:JSON.parse(JSON.stringify({...snapshot,...(body.action==="save"?{questionCards:null,questionCardsVersion:null}:{}),questionReview:{hash,state:body.action==="approve"?"approved":"pending",notes:String(body.notes??"").slice(0,10000),...(body.action==="approve"?{approvedAt:new Date().toISOString()}:{})},questionFeedback:[...history,{at:new Date().toISOString(),action:body.action,before:job.generatedQueries,after:queries,notes:String(body.notes??"").slice(0,10000)}]})),
      }})
      if(changed.count!==1)throw Error("Список изменён другим пользователем")
      return {hash,approved:body.action==="approve",validation:job.source === "qa-acceptance"}
    })
    if(result.approved) await tasks.trigger("audit-pipeline",{jobId:id,...(result.validation?{validation:true,excludedPlatforms:["GIGACHAT"]}:{})},{idempotencyKey:`approved-questions-${id}-${result.hash}-${"dispatchVersion" in result?result.dispatchVersion:"approved"}`})
    return NextResponse.json(result)
  } catch(e) {return NextResponse.json({error:e instanceof Error?e.message:"Не удалось сохранить"},{status:409})}
}
