import {expect,it}from"vitest"
import{validateCards,assertCardsApproved,cardsVersion,type QuestionCard}from"@/lib/questions/question-cards"
import type{BusinessMap}from"@/lib/questions/business-map"
const map:BusinessMap={entities:[{id:"shop",name:"FlowerShop",kind:"company",attributes:[],sources:[],confidence:"supported"}],relationships:[],audiences:[{id:"buyers",name:"Buyers",needs:["delivery"],entityIds:["shop"],sources:[],confidence:"supported"}],geography:[],scope:[{entityId:"shop",audienceId:"buyers",metric:"seller",rationale:"Choose a shop"}],unknowns:[]}
const card:QuestionCard={query:"Где заказать букет?",entityId:"shop",audienceId:"buyers",need:"delivery",intent:"choice",rationale:"find supplier",expectedAnswer:"sellers",mentionRule:{metric:"seller",names:["FlowerShop"],explanation:"Specific seller named"},evidence:[],decision:"accept",critique:"relevant"}
it("requires each question exactly once",()=>{expect(()=>validateCards([card,card],[card.query],map)).toThrow()})
it("does not count product selection as seller visibility",()=>{const c={...card,expectedAnswer:"products" as const};expect(validateCards([c],[c.query],map)[0].decision).toBe("reject")})
it("rejects invented citations and names",()=>{const c={...card,evidence:[{url:"https://example.com",quote:"fabricated"}],mentionRule:{...card.mentionRule,names:["Other"]}};expect(()=>assertCardsApproved([c],[c.query],map)).toThrow()})
it("rejects entity hints in spontaneous questions",()=>{const c={...card,query:"Где заказать FlowerShop?"};expect(validateCards([c],[c.query],map)[0].decision).toBe("reject")})
it("binds review to both business map and questions",()=>{expect(cardsVersion([card.query],map)).not.toBe(cardsVersion([card.query],{...map,unknowns:["changed"]}));expect(()=>assertCardsApproved([card],[card.query],map)).not.toThrow()})

it("keeps question approval versions stable after JSONB reorders map keys",()=>{
 const reversed=JSON.parse(JSON.stringify(map))
 reversed.entities=reversed.entities.map((entity:Record<string,unknown>)=>Object.fromEntries(Object.entries(entity).reverse()))
 expect(cardsVersion(["Where to buy?"],reversed)).toBe(cardsVersion(["Where to buy?"],map))
})

it("restricts model annotation to approved targets while allowing product brands in seller questions",async()=>{
 const {scopedQuestionCardSchema}=await import("@/lib/questions/question-cards")
 const shopMap:BusinessMap={...map,entities:[...map.entities,{id:"xbox",name:"Xbox",kind:"brand",attributes:[],sources:[],confidence:"supported"}]}
 const sellerQuestion={...card,query:"Где купить Xbox?"}
 expect(scopedQuestionCardSchema(shopMap).safeParse(sellerQuestion).success).toBe(true)
 expect(validateCards([sellerQuestion],[sellerQuestion.query],shopMap)[0].decision).toBe("accept")
 expect(scopedQuestionCardSchema(shopMap).safeParse({...sellerQuestion,entityId:"xbox"}).success).toBe(false)
 expect(scopedQuestionCardSchema(shopMap).safeParse({...sellerQuestion,mentionRule:{...card.mentionRule,names:["Xbox"]}}).success).toBe(false)
 expect(validateCards([{...sellerQuestion,query:"Где купить FlowerShop?"}],["Где купить FlowerShop?"],shopMap)[0].decision).toBe("reject")
})
