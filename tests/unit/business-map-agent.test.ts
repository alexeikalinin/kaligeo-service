import {beforeEach,it,expect,vi} from "vitest"
const generate=vi.hoisted(()=>vi.fn())
vi.mock("ai",async original=>({...await original<typeof import("ai")>(),generateText:generate}))
import {buildBusinessMap,UnfinishedBusinessMapError,businessMapDraftSchema} from "@/lib/agents/business-map-agent"
const map={entities:[],relationships:[],audiences:[],scope:[],geography:[],unknowns:[]}
beforeEach(()=>vi.clearAllMocks())
it("never reads or stores truncated structured output",async()=>{const output=vi.fn(()=>{throw Error("No output generated")});const result={finishReason:"length",get output(){return output()}};generate.mockResolvedValue(result);await expect(buildBusinessMap([{url:"https://example.com",text:"Company"}],"Company")).rejects.toBeInstanceOf(UnfinishedBusinessMapError);expect(output).not.toHaveBeenCalled();expect(generate).toHaveBeenCalledOnce()})
it("keeps a finished map grounded in the supplied documents",async()=>{generate.mockResolvedValue({finishReason:"stop",output:map});expect(await buildBusinessMap([{url:"https://example.com",text:"Company"}],"Company")).toEqual(map)})
it("bounds the initial overview without imposing a particular industry",()=>{expect(businessMapDraftSchema.safeParse({...map,audiences:Array.from({length:5},()=>({id:"a",name:"Audience",needs:[],entityIds:[],sources:[],confidence:"uncertain"}))}).success).toBe(false)})
