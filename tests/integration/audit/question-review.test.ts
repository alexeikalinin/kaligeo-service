import {beforeEach,describe,it,expect,vi} from "vitest"
const state=vi.hoisted(()=>({cookie:"admin",job:{} as Record<string,unknown>,update:vi.fn(),trigger:vi.fn()}))
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:state.cookie})})}))
vi.mock("@trigger.dev/sdk/v3",()=>({tasks:{trigger:state.trigger}}))
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:async(work:(tx:unknown)=>unknown)=>work({auditJob:{findUniqueOrThrow:async()=>state.job,updateMany:state.update}})}}))
import {POST} from "@/app/api/admin/jobs/[id]/questions/route"
import {NextRequest} from "next/server"
import {questionHash} from "@/lib/questions/review"
const queries=Array.from({length:15},(_,i)=>`Выбор услуги ${i}`)
const post=(body:unknown)=>POST(new NextRequest("https://app.kaligeo.by/api/admin/jobs/job/questions",{method:"POST",body:JSON.stringify(body)}),{params:Promise.resolve({id:"job"})})
describe("Question review mutation gate",()=>{
 beforeEach(()=>{vi.stubEnv("ADMIN_SESSION_TOKEN","admin");state.cookie="admin";state.update.mockReset().mockResolvedValue({count:1});state.trigger.mockReset();state.job={id:"job",tier:"BASIC",status:"GENERATING_QUERIES",updatedAt:new Date(),generatedQueries:queries,analysisSnapshot:{questionReview:{state:"pending",hash:questionHash(queries)},questionCards:[{query:"old"}]}}})
 it("rejects unauthenticated approval without dispatch",async()=>{state.cookie="other";expect((await post({action:"approve"})).status).toBe(401);expect(state.trigger).not.toHaveBeenCalled()})
 it("rejects a stale editor without overwriting a newer version",async()=>{expect((await post({action:"save",version:"stale",queries})).status).toBe(409);expect(state.update).not.toHaveBeenCalled();expect(state.trigger).not.toHaveBeenCalled()})
 it("saving corrections clears critique and approval and does not run platform calls",async()=>{const changed=[...queries];changed[0]="Где заказать услугу рядом?";expect((await post({action:"save",version:questionHash(queries),queries:changed,notes:"Уточнена потребность"})).status).toBe(200);const snapshot=state.update.mock.calls[0][0].data.analysisSnapshot;expect(snapshot.questionReview.state).toBe("pending");expect(snapshot.questionCards).toBeNull();expect(snapshot.questionFeedback[0].before).toEqual(queries);expect(state.trigger).not.toHaveBeenCalled()})
})
