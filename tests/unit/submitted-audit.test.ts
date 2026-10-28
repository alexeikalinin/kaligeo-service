import {it,expect} from "vitest"
import type {UIMessage} from "ai"
import {submittedAuditId} from "@/lib/chat/submitted-audit"
const message=(part:unknown)=>[{id:"m",role:"assistant",parts:[part]}] as UIMessage[]
it("reads the SDK 6 static and dynamic audit result formats",()=>{
 expect(submittedAuditId(message({type:"tool-submit_audit",state:"output-available",output:{jobId:"job"}}))).toBe("job")
 expect(submittedAuditId(message({type:"dynamic-tool",toolName:"submit_audit",state:"output-available",output:{jobId:"job2"}}))).toBe("job2")
})
it("does not treat incomplete outputs or another tool as a submitted audit",()=>{
 expect(submittedAuditId(message({type:"tool-submit_audit",state:"input-available",output:{jobId:"job"}}))).toBeNull()
 expect(submittedAuditId(message({type:"tool-analyze_website",state:"output-available",output:{jobId:"job"}}))).toBeNull()
 expect(submittedAuditId(message({type:"tool-submit_audit",state:"output-available",output:{jobId:42}}))).toBeNull()
})
