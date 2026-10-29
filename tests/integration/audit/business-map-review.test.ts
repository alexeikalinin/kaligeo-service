import {beforeEach,it,expect,vi} from "vitest"
import {NextRequest} from "next/server"
const state=vi.hoisted(()=>({job:{} as Record<string,unknown>,update:vi.fn(),trigger:vi.fn()}))
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:"admin"})})}))
vi.mock("@trigger.dev/sdk/v3",()=>({tasks:{trigger:state.trigger}}))
vi.mock("@/lib/prisma",()=>({prisma:{$transaction:async(work:(tx:unknown)=>unknown)=>work({auditJob:{findUniqueOrThrow:async()=>state.job,updateMany:state.update}})}}))
import {POST} from "@/app/api/admin/jobs/[id]/business-map/route"
import {mapHash,validateBusinessMap} from "@/lib/questions/business-map"
const map=validateBusinessMap({entities:[{id:"c",name:"Company",kind:"company",attributes:[],sources:[],confidence:"supported"}],relationships:[],audiences:[{id:"a",name:"Buyers",needs:["buy"],entityIds:["c"],sources:[],confidence:"supported"},{id:"b",name:"Repair",needs:["repair"],entityIds:["c"],sources:[],confidence:"supported"}],geography:[],scope:[{entityId:"c",audienceId:"a",metric:"seller",rationale:"buy"},{entityId:"c",audienceId:"b",metric:"seller",rationale:"repair"}],unknowns:[]})
const post=(body:unknown)=>POST(new NextRequest("https://app.kaligeo.by/api/admin/jobs/job/business-map",{method:"POST",body:JSON.stringify(body)}),{params:Promise.resolve({id:"job"})})
beforeEach(()=>{vi.stubEnv("ADMIN_SESSION_TOKEN","admin");state.update.mockReset().mockResolvedValue({count:1});state.trigger.mockReset().mockResolvedValue({id:"run"});state.job={id:"job",source:"qa-acceptance",status:"GENERATING_QUERIES",updatedAt:new Date(),analysisSnapshot:{businessMap:map,businessMapReview:{state:"pending",hash:mapHash(map)}}}})
it("allows deselecting audiences with no mandatory comment and no dispatch",async()=>{const changed={...map,scope:[map.scope[0]]};expect((await post({action:"save",map:changed,version:mapHash(map),notes:""})).status).toBe(200);expect(state.update.mock.calls[0][0].data.analysisSnapshot.businessMap.scope).toHaveLength(1);expect(state.trigger).not.toHaveBeenCalled()})
it("starts preparation only after explicit approval and records queue time",async()=>{expect((await post({action:"approve",map,version:mapHash(map),notes:""})).status).toBe(200);expect(state.trigger).toHaveBeenCalledOnce();expect(state.update.mock.calls[0][0].data.analysisSnapshot.questionPreparation.state).toBe("queued")})
