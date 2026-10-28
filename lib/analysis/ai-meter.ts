import { AsyncLocalStorage } from "node:async_hooks"
import { randomUUID } from "node:crypto"
import { prisma } from "../prisma"
import { currentInternalUsage, internalCost } from "./internal-usage"
export interface MeterUsage { inputTokens?:number; outputTokens?:number; cachedInputTokens?:number; estimatedUsd?:number|null }
const meter=new AsyncLocalStorage<MeterUsage>()
export function captureAiUsage(usage:MeterUsage){Object.assign(meter.getStore()??{},usage)}
export function validateBudget(value:unknown):number|null{
 if(value===null||value===""||value===undefined)return null
 const n=Number(value);if(!Number.isFinite(n)||n<=0||n>1000)throw Error("Бюджет должен быть от 0 до 1000 USD")
 return n
}
/** Reservation is an estimate, not an invoice or a provider-side spending cap. */
export async function meteredAiCall<T>(provider:string,model:string,reserveUsd:number,work:()=>Promise<T>):Promise<T>{
 const scope=currentInternalUsage();if(!scope)return work()
 const id=randomUUID(),at=new Date().toISOString(),usage:MeterUsage={}
 const entry={id,at,...scope,provider,model,state:"reserved",reservedUsd:reserveUsd,estimatedUsd:null,priceVersion:"2026-10-28"}
 const reserved=await prisma.$executeRaw`UPDATE "AuditJob" SET "aiUsage"=COALESCE("aiUsage",'{}'::jsonb)||jsonb_build_object(${id}::text,${JSON.stringify(entry)}::jsonb) WHERE id=${scope.jobId} AND ("aiBudgetUsd" IS NULL OR COALESCE((SELECT SUM(COALESCE((value->>'estimatedUsd')::numeric,(value->>'reservedUsd')::numeric,0)) FROM jsonb_each(COALESCE("aiUsage",'{}'::jsonb))),0)+${reserveUsd} <= "aiBudgetUsd")`
 if(!reserved)throw Error("Лимит оценочного бюджета аудита исчерпан. Увеличьте бюджет в кабинете администратора; сохранённые ответы не потеряны.")
 let state="failed"
 try{const result=await meter.run(usage,work);state="completed";return result}
 finally{
  const priceModel=model==="CHATGPT"?"gpt-4o":model==="GEMINI"?"gemini-2.5-flash":model
  const estimatedUsd=usage.estimatedUsd??internalCost(priceModel,usage.inputTokens,usage.outputTokens,usage.cachedInputTokens)
  const finished={...entry,...usage,estimatedUsd,state,completedAt:new Date().toISOString()}
  // Never repeat a successful paid request because accounting persistence failed.
  try{await prisma.$executeRaw`UPDATE "AuditJob" SET "aiUsage"=COALESCE("aiUsage",'{}'::jsonb)||jsonb_build_object(${id}::text,${JSON.stringify(finished)}::jsonb) WHERE id=${scope.jobId}`}
  catch{console.error("[ai-meter] settlement failed",JSON.stringify(finished))}
 }
}
