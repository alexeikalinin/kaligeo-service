import {expect,it}from"vitest"
import{reviewFeedback}from"@/lib/questions/review-feedback"
it("uses reviewer notes but does not promote unapproved examples",()=>{const result=reviewFeedback({questionReview:{notes:"Focus on supplier choice"},questionFeedback:[{action:"save",after:["bad"]},{action:"approve",after:["approved"],notes:"verified"}]});expect(result.reviewerNotes).toBe("Focus on supplier choice");expect(result.approvedExamples).toEqual([{notes:"verified",questions:["approved"]}])})
