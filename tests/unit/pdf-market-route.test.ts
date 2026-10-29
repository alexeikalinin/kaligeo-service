import {it,expect,vi,afterEach} from "vitest"
vi.mock("@/lib/prisma",()=>({prisma:{auditJob:{findUniqueOrThrow:async()=>({market:"by",report:{}})}}}))
vi.mock("@vercel/blob",()=>({put:async()=>({url:"https://store.public.blob.vercel-storage.com/reports/job.pdf"})}))
import {renderAndUploadPdf} from "@/trigger/steps/render-pdf"
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()})
it("renders a BY report through the BY app even if the legacy default points to RU",async()=>{vi.stubEnv("NEXT_PUBLIC_APP_URL","https://app.kaligeo.ru");const fetch=vi.fn().mockResolvedValue({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)});vi.stubGlobal("fetch",fetch);await renderAndUploadPdf("job");expect(fetch.mock.calls[0][0]).toBe("https://app.kaligeo.by/api/report/generate-pdf")})
