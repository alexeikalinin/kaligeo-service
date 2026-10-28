import {NextRequest,NextResponse} from "next/server"
import {cookies} from "next/headers"
import {configure,tasks,runs} from "@trigger.dev/sdk/v3"
import {z} from "zod"
export const maxDuration=60
async function authorized(){const token=process.env.ADMIN_SESSION_TOKEN;return !!token&&(await cookies()).get("admin_session")?.value===token}
function configureProduction(){const key=process.env.TRIGGER_PROD_SECRET_KEY??process.env.TRIGGER_SECRET_KEY;if(!key?.startsWith("tr_prod_"))throw Error("Не настроена авторизация production Trigger.dev");configure({accessToken:key})}
const input=z.object({platforms:z.array(z.enum(["CHATGPT","CLAUDE","GEMINI","PERPLEXITY","DEEPSEEK","YANDEXGPT","GIGACHAT","ALISA","GROK"])).min(1).max(9)})
export async function POST(req:NextRequest){
 if(!await authorized())return NextResponse.json({error:"Unauthorized"},{status:401})
 try{const body=input.parse(await req.json());configureProduction();const run=await tasks.trigger("platform-health-check",{platforms:[...new Set(body.platforms)],force:true});return NextResponse.json({runId:run.id},{status:202})}
 catch(e){return NextResponse.json({error:e instanceof z.ZodError?"Выберите платформы для проверки":"Не удалось поставить проверку в очередь"},{status:400})}
}
export async function GET(req:NextRequest){
 if(!await authorized())return NextResponse.json({error:"Unauthorized"},{status:401})
 const id=req.nextUrl.searchParams.get("runId");if(!id||!/^run_[a-z0-9]+$/.test(id))return NextResponse.json({error:"Нужен идентификатор проверки"},{status:400})
 try{configureProduction();const run=await runs.retrieve(id);if(run.taskIdentifier!=="platform-health-check")return NextResponse.json({error:"Forbidden"},{status:403});return NextResponse.json({status:run.status,output:run.output??null,...(run.isFailed?{error:"Проверка завершилась ошибкой"}:{})})}
 catch{return NextResponse.json({error:"Не удалось получить результат проверки"},{status:502})}
}
