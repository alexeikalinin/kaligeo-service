import {task} from "@trigger.dev/sdk/v3"
import {prisma} from "../lib/prisma"
import {getActivePlatforms} from "../lib/ai-clients"
import {INTERNAL_FLASH_MODEL,INTERNAL_LITE_MODEL} from "../lib/models"
/** Read-only readiness check: no model requests, emails or audit creation. */
export const auditReadiness=task({id:"audit-readiness",maxDuration:60,retry:{maxAttempts:1},run:async()=>{
 const usable=(name:string)=>!!process.env[name]&&!/SENSITIVE|placeholder/i.test(process.env[name]!)
 await prisma.auditJob.findFirst({select:{id:true,aiBudgetUsd:true,aiUsage:true}})
 return {database:true,accountingSchema:true,platforms:getActivePlatforms(),internalModels:{analysis:INTERNAL_FLASH_MODEL,classification:INTERNAL_LITE_MODEL,configured:usable("GOOGLE_AI_API_KEY")},openaiGenerator:usable("OPENAI_API_KEY"),pdf:usable("BLOB_READ_WRITE_TOKEN")&&usable("INTERNAL_SECRET"),email:usable("RESEND_API_KEY"),reviewTelegram:usable("ADMIN_TELEGRAM_BOT_TOKEN")&&usable("ADMIN_TELEGRAM_CHAT_ID")}
}})
