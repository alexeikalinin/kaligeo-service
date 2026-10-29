import {it,expect,vi} from "vitest"
import {NextRequest} from "next/server"
const state=vi.hoisted(()=>({find:vi.fn(),send:vi.fn().mockResolvedValue({})}))
vi.mock("@/lib/prisma",()=>({prisma:{auditJob:{findMany:state.find}}}))
vi.mock("@/lib/rate-limit",()=>({checkRateLimit:vi.fn().mockResolvedValue(true)}))
vi.mock("resend",()=>({Resend:class{emails={send:state.send}}}))
import {POST} from "@/app/api/report/recover/route"
it("recovers only BY reports with BY links and BY sender even with RU global env",async()=>{
 vi.stubEnv("NEXT_PUBLIC_APP_URL","https://app.kaligeo.ru");vi.stubEnv("FROM_EMAIL","hello@kaligeo.ru");vi.stubEnv("FROM_EMAIL_BY","hello@kaligeo.by")
 state.find.mockResolvedValue([{id:"by-job",companyName:"Company",reportToken:"token",report:{overallScore:50},completedAt:null}])
 const r=await POST(new NextRequest("https://app.kaligeo.by/api/report/recover",{method:"POST",body:JSON.stringify({email:"owner@example.com"})}))
 expect(r.status).toBe(200);expect(state.find.mock.calls[0][0].where.market).toBe("by")
 const sent=state.send.mock.calls[0][0];expect(sent.from).toBe("hello@kaligeo.by");expect(sent.html).toContain("https://app.kaligeo.by/report/by-job");expect(sent.html).not.toContain("kaligeo.ru")
})
