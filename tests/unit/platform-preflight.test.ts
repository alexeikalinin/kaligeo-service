import {beforeEach,describe,it,expect,vi} from "vitest"
const state=vi.hoisted(()=>({query:vi.fn(),find:vi.fn(),create:vi.fn(),write:vi.fn(),configured:vi.fn()}))
vi.mock("@/lib/prisma",()=>({prisma:{serviceInquiry:{findFirst:state.find,create:state.create},$executeRaw:state.write}}))
vi.mock("@/lib/ai-clients",()=>({AI_CLIENTS:{CHATGPT:{name:"ChatGPT",isConfigured:state.configured,query:state.query},GEMINI:{name:"Gemini",isConfigured:state.configured,query:state.query},CLAUDE:{name:"Claude",isConfigured:state.configured,query:state.query}}}))
import {probePlatforms,ensurePlatformsReady,classifyProbeError,PlatformPreflightError} from "@/lib/ai-clients/preflight"
beforeEach(()=>{vi.clearAllMocks();state.find.mockResolvedValue(null);state.create.mockResolvedValue({});state.write.mockResolvedValue(1);state.configured.mockReturnValue(true);state.query.mockResolvedValue("4")})
describe("Real platform preflight",()=>{
 it("asks exactly once per selected provider and never contacts excluded providers",async()=>{const rows=await probePlatforms(["CHATGPT","GEMINI","CHATGPT"],{force:true});expect(rows).toHaveLength(2);expect(rows.every(r=>r.status==="ok")).toBe(true);expect(state.query).toHaveBeenCalledTimes(2);expect(rows.map(r=>r.platform)).not.toContain("CLAUDE");expect(state.query.mock.calls[0][2].signal).toBeInstanceOf(AbortSignal)})
 it("does not call an unconfigured provider",async()=>{state.configured.mockReturnValue(false);expect((await probePlatforms(["CHATGPT"]))[0].status).toBe("unconfigured");expect(state.query).not.toHaveBeenCalled()})
 it("reuses only a recent successful check with matching configuration",async()=>{state.find.mockResolvedValue({payload:{result:{platform:"CHATGPT",status:"ok",checkedAt:new Date().toISOString()}}});expect((await probePlatforms(["CHATGPT"]))[0].reused).toBe(true);expect(state.query).not.toHaveBeenCalled();expect(state.find.mock.calls[0][0].where.payload.path).toEqual(["fingerprint"])})
 it("does not cache failure as success or repeat a paid check if persistence fails",async()=>{state.find.mockResolvedValue({payload:{result:{status:"error"}}});state.create.mockRejectedValue(Error("storage"));expect((await probePlatforms(["CHATGPT"]))[0].status).toBe("ok");expect(state.query).toHaveBeenCalledOnce()})
 it("retains diagnostic failure and blocks the audit",async()=>{state.query.mockRejectedValue({status:402,message:"secret response content"});await expect(ensurePlatformsReady("job",["CHATGPT"])).rejects.toBeInstanceOf(PlatformPreflightError);expect(state.write).toHaveBeenCalledOnce();expect(JSON.stringify(state.create.mock.calls)).not.toContain("secret response content")})
 it("rejects empty responses and terminates an aborted request",async()=>{
  state.query.mockResolvedValueOnce(" ")
  expect((await probePlatforms(["CHATGPT"]))[0].reason).toBe("empty_response")
  state.query.mockImplementationOnce((_q,_s,options)=>{
   return new Promise((_resolve,reject)=>{
    options.signal.addEventListener("abort",()=>reject(new DOMException("Aborted","AbortError")))
   })
  })
  expect((await probePlatforms(["CHATGPT"],{timeoutMs:5}))[0].reason).toBe("timeout")
 })

 it("distinguishes payment, quota, access and transient rate limits without exposing raw errors",()=>{expect(classifyProbeError({status:402}).reason).toBe("payment");expect(classifyProbeError(Error("Perplexity error: 402")).reason).toBe("payment");expect(classifyProbeError({status:429,code:"insufficient_quota"}).reason).toBe("quota");expect(classifyProbeError({status:429}).reason).toBe("rate_limit");expect(classifyProbeError({status:401}).reason).toBe("authentication");expect(classifyProbeError({status:403}).reason).toBe("access")})
})
