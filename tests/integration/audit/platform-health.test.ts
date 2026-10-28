import {beforeEach,it,expect,vi} from "vitest"
const state=vi.hoisted(()=>({cookie:"admin",trigger:vi.fn(),retrieve:vi.fn()}))
vi.mock("next/headers",()=>({cookies:async()=>({get:()=>({value:state.cookie})})}))
vi.mock("@trigger.dev/sdk/v3",()=>({configure:vi.fn(),tasks:{trigger:state.trigger},runs:{retrieve:state.retrieve}}))
import {POST,GET} from "@/app/api/admin/platform-health/route"
import {NextRequest} from "next/server"
beforeEach(()=>{vi.clearAllMocks();vi.stubEnv("ADMIN_SESSION_TOKEN","admin");vi.stubEnv("TRIGGER_PROD_SECRET_KEY","tr_prod_test");state.cookie="admin"})
it("never dispatches a paid diagnostic without administrator authentication",async()=>{state.cookie="wrong";expect((await POST(new NextRequest("https://app.kaligeo.by/api/admin/platform-health",{method:"POST",body:'{"platforms":["CHATGPT"]}'}))).status).toBe(401);expect(state.trigger).not.toHaveBeenCalled()})
it("dispatches only the selected providers to the audit runtime",async()=>{state.trigger.mockResolvedValue({id:"run_test"});const r=await POST(new NextRequest("https://app.kaligeo.by/api/admin/platform-health",{method:"POST",body:'{"platforms":["CHATGPT","GEMINI"]}'}));expect(r.status).toBe(202);expect(state.trigger).toHaveBeenCalledWith("platform-health-check",{platforms:["CHATGPT","GEMINI"],force:true})})
it("does not expose unrelated task output through diagnostic polling",async()=>{state.retrieve.mockResolvedValue({taskIdentifier:"audit-pipeline",output:{private:"data"}});const r=await GET(new NextRequest("https://app.kaligeo.by/api/admin/platform-health?runId=run_test"));expect(r.status).toBe(403);expect(await r.text()).not.toContain("private")})
