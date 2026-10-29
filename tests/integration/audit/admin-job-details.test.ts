import {beforeEach,expect,it,vi} from "vitest"
import {NextRequest} from "next/server"
const state=vi.hoisted(()=>({cookie:"admin",find:vi.fn()}))
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:state.cookie})})}))
vi.mock("@/lib/prisma",()=>({prisma:{auditJob:{findUnique:state.find}}}))
import {GET} from "@/app/api/admin/jobs/[id]/route"
const read=()=>GET(new NextRequest("https://app.kaligeo.by/api/admin/jobs/job"),{params:Promise.resolve({id:"job"})})
beforeEach(()=>{vi.stubEnv("ADMIN_SESSION_TOKEN","admin");state.cookie="admin";state.find.mockReset()})
it("requires administrator authentication before querying a job",async()=>{state.cookie="other";expect((await read()).status).toBe(401);expect(state.find).not.toHaveBeenCalled()})
it("does not authorize an absent admin secret",async()=>{vi.stubEnv("ADMIN_SESSION_TOKEN","");state.cookie="";expect((await read()).status).toBe(401)})
it("links completed reports through a protected route without exposing a report token",async()=>{state.find.mockResolvedValue({id:"job",status:"COMPLETED",report:{id:"report"}});const response=await read();expect(response.headers.get("cache-control")).toBe("private, no-store");expect(await response.json()).toMatchObject({reportUrl:"/admin/jobs/job/report"});expect(state.find.mock.calls[0][0].select.reportToken).toBeUndefined()})
it("does not offer a report for unfinished jobs",async()=>{state.find.mockResolvedValue({id:"job",status:"ANALYZING",report:null});expect((await (await read()).json()).reportUrl).toBeNull()})
