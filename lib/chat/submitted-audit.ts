import type {UIMessage} from "ai"
/** Derive completion from SDK 6 tool output without duplicating message state. */
export function submittedAuditId(messages:UIMessage[]):string|null{
 let id:string|null=null
 for(const message of messages)for(const part of message.parts){
  const p=part as unknown as Record<string,unknown>
  if((p.type==="tool-submit_audit"||(p.type==="dynamic-tool"&&p.toolName==="submit_audit"))&&p.state==="output-available"&&p.output&&typeof p.output==="object"&&"jobId" in p.output&&typeof p.output.jobId==="string")id=p.output.jobId
 }
 return id
}
