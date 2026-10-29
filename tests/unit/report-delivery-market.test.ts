import {it,expect,vi} from "vitest"
const send=vi.hoisted(()=>vi.fn().mockResolvedValue({}))
vi.mock("resend",()=>({Resend:class{emails={send}}}))
import {sendReportEmail,sendFollowUpEmail} from "@/trigger/steps/deliver"
it("uses the BY sender for the report and recurring audit independent of shared RU env",async()=>{
 vi.stubEnv("FROM_EMAIL","hello@kaligeo.ru");vi.stubEnv("FROM_EMAIL_BY","hello@kaligeo.by")
 const opts={market:"by" as const,to:"owner@example.com",companyName:"Company",overallScore:50,reportUrl:"https://app.kaligeo.by/report/job"}
 await sendReportEmail(opts);await sendFollowUpEmail({...opts,baselineScore:40})
 for(const [sent] of send.mock.calls){expect(sent.from).toBe("hello@kaligeo.by");expect(sent.html).not.toContain("kaligeo.ru")}
})
