import { expect,it } from "vitest"
import {isQuestionSetApproved,questionHash,validateQuestionSet} from "@/lib/questions/review"
it("binds approval to exact content and order",()=>{const q=["one","two"];const r={hash:questionHash(q),state:"approved" as const,notes:""};expect(isQuestionSetApproved(q,r)).toBe(true);expect(isQuestionSetApproved(["two","one"],r)).toBe(false);expect(isQuestionSetApproved(["one","changed"],r)).toBe(false);expect(isQuestionSetApproved(q)).toBe(false)})
it("rejects empty, duplicate and wrong tariff sets",()=>{expect(()=>validateQuestionSet(["a","a"],2)).toThrow();expect(()=>validateQuestionSet(["a"],2)).toThrow();expect(()=>validateQuestionSet(["a"," "],2)).toThrow()})
