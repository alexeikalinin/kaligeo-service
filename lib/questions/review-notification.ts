import { prisma } from "../prisma"
export async function notifyReviewReady(jobId:string,stage:"businessMap"|"questions",version:string,companyName:string,appUrl:string){
 const token=process.env.ADMIN_TELEGRAM_BOT_TOKEN,chat=process.env.ADMIN_TELEGRAM_CHAT_ID
 const entry={version,state:token&&chat?"sending":"unconfigured",at:new Date().toISOString()}
 const claimed=await prisma.$executeRaw`UPDATE "AuditJob" SET "analysisSnapshot"=jsonb_set(COALESCE("analysisSnapshot",'{}'::jsonb),'{reviewNotifications}',COALESCE("analysisSnapshot"->'reviewNotifications','{}'::jsonb)||jsonb_build_object(${stage}::text,${JSON.stringify(entry)}::jsonb)) WHERE id=${jobId} AND (COALESCE("analysisSnapshot"->'reviewNotifications'->${stage}::text->>'version','')<>${version} OR "analysisSnapshot"->'reviewNotifications'->${stage}::text->>'state' IN ('failed','unconfigured') OR ("analysisSnapshot"->'reviewNotifications'->${stage}::text->>'state'='sending' AND ("analysisSnapshot"->'reviewNotifications'->${stage}::text->>'at')::timestamptz < NOW()-INTERVAL '5 minutes'))`
 if(!claimed||!token||!chat)return
 let state="failed"
 try{
 const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},signal:AbortSignal.timeout(10000),body:JSON.stringify({chat_id:chat,text:`Требуется проверка: ${stage==="businessMap"?"карта бизнеса":"вопросы"}\n${companyName}\n${new URL('/admin/question-review',appUrl).toString()}`})})
 const body=await r.json();if(r.ok&&body.ok)state="sent"
 }catch{}
 const result={version,state,at:new Date().toISOString()}
 await prisma.$executeRaw`UPDATE "AuditJob" SET "analysisSnapshot"=jsonb_set("analysisSnapshot",ARRAY['reviewNotifications',${stage}::text],${JSON.stringify(result)}::jsonb) WHERE id=${jobId} AND "analysisSnapshot"->'reviewNotifications'->${stage}::text->>'version'=${version}`
}
