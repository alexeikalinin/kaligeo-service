import { isBrandQuestion } from "../analysis/query-methodology"
import { z } from "zod"
import { createHash } from "node:crypto"
import type { BusinessMap } from "./business-map"
export const questionCardSchema=z.object({
 query:z.string(),entityId:z.string(),audienceId:z.string(),need:z.string(),intent:z.string(),rationale:z.string(),
 expectedAnswer:z.enum(["companies","products","sellers","brand-facts"]),
 mentionRule:z.object({metric:z.enum(["company","owned-product","seller","recognition"]),names:z.array(z.string().min(1)).min(1),explanation:z.string()}),
 evidence:z.array(z.object({url:z.string().url(),quote:z.string().min(1)})),
})
export type QuestionCard=z.infer<typeof questionCardSchema>&{decision:"accept"|"revise"|"reject";critique:string;suggestedQuery?:string|null}
export function cardsVersion(queries:string[],map:BusinessMap){return createHash("sha256").update(JSON.stringify({queries,map,version:"question-cards-v1"})).digest("hex")}
export function validateCards(cards:QuestionCard[],queries:string[],map:BusinessMap):QuestionCard[]{
 if(cards.length!==queries.length||new Set(cards.map(c=>c.query)).size!==queries.length||queries.some(q=>!cards.some(c=>c.query===q)))throw Error("Проверка должна охватывать каждый вопрос ровно один раз")
 return queries.map(query=>{
  const c=cards.find(c=>c.query===query)!;questionCardSchema.parse(c)
  const entity=map.entities.find(e=>e.id===c.entityId),audience=map.audiences.find(a=>a.id===c.audienceId)
  const reasons:string[]=[]
  if((c.mentionRule.metric==="recognition")!==isBrandQuestion(query))reasons.push("Прямые брендовые вопросы должны оцениваться отдельно")
  if(entity&&c.mentionRule.metric!=="recognition"&&[entity.name,...(entity.aliases??[])].some(n=>query.toLowerCase().includes(n.toLowerCase())))reasons.push("Спонтанный вопрос содержит название целевой сущности")
  if(!entity||!audience)reasons.push("Неизвестная сущность или аудитория")
  if(c.mentionRule.metric!=="recognition"&&!map.scope.some(s=>s.entityId===c.entityId&&s.audienceId===c.audienceId&&s.metric===c.mentionRule.metric))reasons.push("Вопрос вне утверждённых направлений")
  if(entity&&c.mentionRule.names.some(n=>![entity.name,...(entity.aliases??[])].includes(n)))reasons.push("Название для зачёта не подтверждено картой")
  const sources=[...map.entities,...map.relationships,...map.audiences,...map.geography].flatMap(x=>x.sources)
  if(c.evidence.some(e=>!sources.some(s=>s.url===e.url&&s.quote===e.quote)))reasons.push("Источник не подтверждён картой")
  if(c.mentionRule.metric==="seller"&&c.expectedAnswer!=="sellers")reasons.push("Товар не равнозначен упоминанию продавца")
  if(c.mentionRule.metric==="company"&&c.expectedAnswer!=="companies")reasons.push("Корпоративный вопрос должен искать компании")
  if(c.mentionRule.metric==="owned-product"&&c.expectedAnswer!=="products")reasons.push("Продуктовый вопрос должен искать продукты")
  return reasons.length?{...c,decision:"reject",critique:[c.critique,...reasons].join("; ")}:c
 })
}
export function assertCardsApproved(cards:QuestionCard[],queries:string[],map:BusinessMap){
 const checked=validateCards(cards,queries,map)
 if(checked.some(c=>c.decision!=="accept"))throw Error("Исправьте вопросы, отклонённые проверяющим")
 for(const s of map.scope)if(!checked.some(c=>c.entityId===s.entityId&&c.audienceId===s.audienceId&&c.mentionRule.metric===s.metric))throw Error("Не все выбранные направления покрыты вопросами")
}
