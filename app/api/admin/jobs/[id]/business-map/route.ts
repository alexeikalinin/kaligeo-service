import { cookies } from "next/headers"
import { NextRequest,NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { tasks } from "@trigger.dev/sdk/v3"
import { prisma } from "@/lib/prisma"
import { assertReviewableMap,mapHash,validateBusinessMap } from "@/lib/questions/business-map"
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
 const secret=process.env.ADMIN_SESSION_TOKEN
 if(!secret||(await cookies()).get("admin_session")?.value!==secret)return NextResponse.json({error:"Unauthorized"},{status:401})
 const {id}=await params
 try{
 const body=await req.json();if(!["save","approve","launch"].includes(body.action))throw Error("Некорректное действие")
 const result=await prisma.$transaction(async tx=>{
  const job=await tx.auditJob.findUniqueOrThrow({where:{id}}),snapshot=(job.analysisSnapshot??{}) as Record<string,unknown>
  const review=snapshot.businessMapReview as {state:string;hash:string}|undefined
  if(job.status!=="GENERATING_QUERIES"||!review||review.hash!==body.version)throw Error("Карта изменена. Обновите страницу")
  if(body.action==="launch") {if(review.state!=="approved")throw Error("Карта не утверждена");return{hash:review.hash,approved:true,validation:job.source==="qa-acceptance"}}
  const map=validateBusinessMap(body.map),hash=mapHash(map)
  if(body.action==="approve"){
   if(hash!==review.hash)throw Error("Сначала сохраните изменения карты")
   assertReviewableMap(map)
  }
  const history=Array.isArray(snapshot.businessMapFeedback)?snapshot.businessMapFeedback:[]
  const changed=await tx.auditJob.updateMany({where:{id,updatedAt:job.updatedAt},data:{generatedQueries:Prisma.DbNull,analysisSnapshot:JSON.parse(JSON.stringify({...snapshot,businessMap:map,businessMapReview:{hash,state:body.action==="approve"?"approved":"pending",notes:String(body.notes??"").slice(0,10000)},questionPreparation:body.action==="approve"?{state:"queued",queuedAt:new Date().toISOString()}:null,questionReview:null,businessMapFeedback:[...history,{at:new Date().toISOString(),action:body.action,before:snapshot.businessMap,after:map,notes:String(body.notes??"").slice(0,10000)}]}))}})
  if(changed.count!==1)throw Error("Карту изменил другой проверяющий")
  return {hash,approved:body.action==="approve",validation:job.source==="qa-acceptance"}
 })
 if(result.approved)await tasks.trigger("audit-pipeline",{jobId:id,...(result.validation?{validation:true,excludedPlatforms:["GIGACHAT"]}:{})},{idempotencyKey:`approved-map-v2-${id}-${result.hash}`})
 return NextResponse.json(result)
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Ошибка карты"},{status:409})}
}
