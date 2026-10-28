import {task} from "@trigger.dev/sdk/v3"
import {probePlatforms} from "../lib/ai-clients/preflight"
import {getActivePlatforms} from "../lib/ai-clients"
export const platformHealthCheck=task({id:"platform-health-check",maxDuration:120,retry:{maxAttempts:1},run:async(payload:{platforms?:string[];force?:boolean})=>{
 const platforms=payload.platforms??getActivePlatforms().filter(p=>!["CLAUDE","GIGACHAT"].includes(p))
 const results=await probePlatforms(platforms,{force:payload.force??true})
 return {checkedAt:new Date().toISOString(),prompt:"Сколько будет 2 + 2?",results,ready:results.every(r=>r.status==="ok"),note:"Успешный запрос подтверждает доступ сейчас, но не гарантирует остаток средств на весь аудит."}
}})
