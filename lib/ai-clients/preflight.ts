import {createHash} from "node:crypto"
import {AI_CLIENTS} from "./index"
import {prisma} from "../prisma"
import {meteredAiCall} from "../analysis/ai-meter"
export const PREFLIGHT_PROMPT="Сколько будет 2 + 2? Ответь коротко, одним числом."
export const PREFLIGHT_TTL_MS=5*60*1000
const CONFIG:Record<string,string[]>={CHATGPT:["OPENAI_API_KEY"],CLAUDE:["ANTHROPIC_API_KEY"],GEMINI:["GOOGLE_AI_API_KEY"],PERPLEXITY:["PERPLEXITY_API_KEY"],DEEPSEEK:["DEEPSEEK_API_KEY"],YANDEXGPT:["YANDEX_RELAY_URL","YANDEX_RELAY_SECRET"],ALISA:["YANDEX_RELAY_URL","YANDEX_RELAY_SECRET"],GROK:["GROK_API_KEY"],GIGACHAT:["GIGACHAT_CLIENT_ID","GIGACHAT_CLIENT_SECRET"]}
const MODELS:Record<string,string>={CHATGPT:"gpt-4o",CLAUDE:"claude-haiku-4-5-20251001",GEMINI:"gemini-2.5-flash",PERPLEXITY:"sonar",DEEPSEEK:"deepseek-chat",YANDEXGPT:"yandexgpt",ALISA:"yandexgpt-lite",GROK:"grok-3",GIGACHAT:"GigaChat"}
export const DASHBOARDS:Record<string,string>={CHATGPT:"https://platform.openai.com/settings/organization/billing/overview",CLAUDE:"https://console.anthropic.com/settings/billing",GEMINI:"https://aistudio.google.com/",PERPLEXITY:"https://www.perplexity.ai/settings/api",DEEPSEEK:"https://platform.deepseek.com/",YANDEXGPT:"https://console.yandex.cloud/billing",ALISA:"https://console.yandex.cloud/billing",GROK:"https://console.x.ai/",GIGACHAT:"https://developers.sber.ru/portal/products/gigachat-api"}
export type FailureReason="payment"|"quota"|"authentication"|"access"|"rate_limit"|"timeout"|"connection"|"empty_response"|"provider_error"
export interface PlatformProbe {platform:string;name:string;model:string;status:"ok"|"error"|"unconfigured";checkedAt:string;durationMs:number;reused:boolean;message:string;reason?:FailureReason;httpStatus?:number;dashboardUrl:string;response?:string}
export function classifyProbeError(error:unknown):Pick<PlatformProbe,"reason"|"message"|"httpStatus">{
 const e=error as {status?:number;statusCode?:number;name?:string;message?:string;code?:string;error?:{code?:string;message?:string}}
 const status=(e?.status??e?.statusCode??Number(/(?:error|HTTP|status)[:\s]+(\d{3})/i.exec(e?.message??"")?.[1]))||undefined,text=[e?.name,e?.message,e?.code,e?.error?.code,e?.error?.message].join(" ").toLowerCase()
 let reason:FailureReason="provider_error",message="Провайдер не выполнил запрос. Проверьте состояние сервиса."
 if(status===402||/insufficient.(balance|credit)|credit balance|payment.required|billing.*(disabled|exhaust|limit)|not enough.*(balance|credit)/.test(text)){reason="payment";message="Недостаточно средств или требуется оплата. Проверьте баланс провайдера."}
 else if(/insufficient.quota|quota.*(exceed|exhaust)|resource.exhausted/.test(text)){reason="quota";message="Исчерпана или превышена квота. Проверьте баланс и лимиты провайдера."}
 else if(status===401){reason="authentication";message="Провайдер отклонил авторизацию. Проверьте API-ключ."}
 else if(status===403){reason="access";message="Доступ к модели запрещён. Проверьте разрешения и регион провайдера."}
 else if(status===429){reason="rate_limit";message="Превышена частота запросов. Дождитесь восстановления лимита."}
 else if(/timeout|timed.out|abort/.test(text)){reason="timeout";message="Провайдер не ответил за отведённое время."}
 else if(/fetch.failed|connect|network|enotfound|econn|socket/.test(text)){reason="connection";message="Не удалось установить соединение с провайдером."}
 else if(/empty.response/.test(text)){reason="empty_response";message="Провайдер вернул пустой ответ."}
 return {reason,message,...(status?{httpStatus:status}:{})}
}
function fingerprint(platform:string){return createHash("sha256").update(JSON.stringify({version:1,platform,model:MODELS[platform],config:(CONFIG[platform]??[]).map(k=>process.env[k]??"")})).digest("hex")}
export async function probePlatforms(platforms:string[],options:{force?:boolean;timeoutMs?:number}={}):Promise<PlatformProbe[]>{
 const selected=[...new Set(platforms)]
 if(!selected.length||selected.some(p=>!AI_CLIENTS[p]))throw Error("Выберите известные AI-платформы")
 return Promise.all(selected.map(async platform=>{
  const client=AI_CLIENTS[platform],hash=fingerprint(platform),started=Date.now()
  const base={platform,name:client.name,model:MODELS[platform],checkedAt:new Date().toISOString(),durationMs:0,reused:false,dashboardUrl:DASHBOARDS[platform]}
  if(!client.isConfigured())return {...base,status:"unconfigured" as const,message:"Не настроено подключение к платформе."}
  if(!options.force){const saved=await prisma.serviceInquiry.findFirst({where:{kind:"platform-preflight",createdAt:{gte:new Date(Date.now()-PREFLIGHT_TTL_MS)},payload:{path:["fingerprint"],equals:hash}},orderBy:{createdAt:"desc"},select:{payload:true}});const cached=(saved?.payload as {result?:PlatformProbe}|null)?.result;if(cached?.status==="ok")return {...cached,reused:true}}
  let result:PlatformProbe,requestStarted=false
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),options.timeoutMs??30000)
  try{
   const response=await meteredAiCall(platform,MODELS[platform],0.05,()=>{requestStarted=true;return client.query(PREFLIGHT_PROMPT,"Ответь на короткий проверочный вопрос без дополнительных пояснений.",{signal:controller.signal})})
   if(!response.trim())throw Error("Empty response")
   result={...base,status:"ok",message:"Модель выполнила реальный запрос.",durationMs:Date.now()-started,response:response.trim().slice(0,160)}
  }catch(error){if(!requestStarted)throw error;result={...base,status:"error",...classifyProbeError(error),durationMs:Date.now()-started}}
  finally{clearTimeout(timeout)}
  // A logging failure must not retry the paid diagnostic request.
  try{await prisma.serviceInquiry.create({data:{kind:"platform-preflight",payload:JSON.parse(JSON.stringify({fingerprint:hash,result}))}})}catch{console.error("[platform-preflight] result persistence failed",platform)}
  return result
 }))
}
export class PlatformPreflightError extends Error {constructor(public results:PlatformProbe[]){super(`Опрос не запущен. ${results.filter(r=>r.status!=="ok").map(r=>`${r.name}: ${r.message}`).join(" ")} После исправления повторите проверку и запуск.`)}}
export async function ensurePlatformsReady(jobId:string,platforms:string[]){
 const results=await probePlatforms(platforms)
 await prisma.$executeRaw`UPDATE "AuditJob" SET "analysisSnapshot"=jsonb_set(COALESCE("analysisSnapshot",'{}'::jsonb),'{platformPreflight}',${JSON.stringify({at:new Date().toISOString(),results})}::jsonb) WHERE id=${jobId}`
 if(results.some(r=>r.status!=="ok"))throw new PlatformPreflightError(results)
 return results
}
