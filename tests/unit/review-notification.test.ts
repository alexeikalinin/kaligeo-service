import {beforeEach,expect,it,vi}from"vitest"
const {write}=vi.hoisted(()=>({write:vi.fn()}))
vi.mock("@/lib/prisma",()=>({prisma:{$executeRaw:write}}))
import{notifyReviewReady}from"@/lib/questions/review-notification"
beforeEach(()=>{vi.clearAllMocks();vi.unstubAllEnvs();vi.unstubAllGlobals()})
it("does not send duplicate notification for a claimed version",async()=>{vi.stubEnv("ADMIN_TELEGRAM_BOT_TOKEN","token");vi.stubEnv("ADMIN_TELEGRAM_CHAT_ID","chat");write.mockResolvedValue(0);const fetch=vi.fn();vi.stubGlobal("fetch",fetch);await notifyReviewReady("j","questions","v","Company","https://example.com");expect(fetch).not.toHaveBeenCalled()})
it("records Telegram API rejection instead of claiming delivery",async()=>{vi.stubEnv("ADMIN_TELEGRAM_BOT_TOKEN","token");vi.stubEnv("ADMIN_TELEGRAM_CHAT_ID","chat");write.mockResolvedValue(1);vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:true,json:async()=>({ok:false})}));await notifyReviewReady("j","questions","v","Company","https://example.com");expect(write.mock.calls[1].some(v=>typeof v==="string"&&v.includes('"state":"failed"'))).toBe(true)})
