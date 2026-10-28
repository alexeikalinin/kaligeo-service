import {describe,it,expect,vi,beforeEach} from "vitest"
const execute=vi.hoisted(()=>vi.fn())
vi.mock("@/lib/prisma",()=>({prisma:{$executeRaw:execute}}))
import {meteredAiCall,captureAiUsage,validateBudget} from "@/lib/analysis/ai-meter"
import {withInternalUsage} from "@/lib/analysis/internal-usage"
describe("Audit cost reservations",()=>{
 beforeEach(()=>execute.mockReset())
 it("rejects invalid budgets and leaves an unset budget optional",()=>{expect(validateBudget("")).toBeNull();expect(validateBudget("3.5")).toBe(3.5);expect(()=>validateBudget(-1)).toThrow();expect(()=>validateBudget(Infinity)).toThrow()})
 it("does not call a provider if the atomic reservation is rejected",async()=>{execute.mockResolvedValue(0);const work=vi.fn();await expect(withInternalUsage("job","analysis",()=>meteredAiCall("google","gemini-2.5-flash",.1,work))).rejects.toThrow("бюджета");expect(work).not.toHaveBeenCalled()})
 it("settles real usage and never retries successful work when logging fails",async()=>{execute.mockResolvedValueOnce(1).mockRejectedValueOnce(Error("storage"));const work=vi.fn(async()=>{captureAiUsage({inputTokens:1000,outputTokens:100});return "answer"});expect(await withInternalUsage("job","analysis",()=>meteredAiCall("google","gemini-2.5-flash",.1,work))).toBe("answer");expect(work).toHaveBeenCalledOnce();expect(JSON.stringify(execute.mock.calls[1])).toContain("0.00055")})
 it("retains failed calls and unknown costs as unknown",async()=>{execute.mockResolvedValue(1);await expect(withInternalUsage("job","platform",()=>meteredAiCall("relay","unknown",.05,async()=>{throw Error("timeout")}))).rejects.toThrow("timeout");const settled=JSON.stringify(execute.mock.calls[1]);expect(settled).toContain('failed');expect(settled).toContain('estimatedUsd');expect(settled).toContain('null')})
})
