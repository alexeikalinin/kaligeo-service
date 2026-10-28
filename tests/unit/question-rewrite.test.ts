import{expect,it}from"vitest"
import{applyReplacements}from"@/lib/agents/question-rewrite-agent"
it("preserves every unselected question",()=>expect(applyReplacements(["a","b","c"],[1],[{index:1,query:"new"}])).toEqual(["a","new","c"]))
it("rejects extra replacements and duplicate results",()=>{expect(()=>applyReplacements(["a","b"],[1],[{index:0,query:"new"}])).toThrow();expect(()=>applyReplacements(["a","b"],[1],[{index:1,query:"a"}])).toThrow()})
