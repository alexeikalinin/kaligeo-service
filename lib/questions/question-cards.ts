import { isBrandQuestion } from "../analysis/query-methodology"
import { z } from "zod"
import { createHash } from "node:crypto"
import {mapHash,type BusinessMap} from "./business-map"
export const questionCardSchema=z.object({
 query:z.string(),entityId:z.string(),audienceId:z.string(),need:z.string(),intent:z.string(),rationale:z.string(),
 expectedAnswer:z.enum(["companies","products","sellers","brand-facts"]),
 mentionRule:z.object({metric:z.enum(["company","owned-product","seller","recognition"]),names:z.array(z.string().min(1)).min(1),explanation:z.string()}),
 evidence:z.array(z.object({url:z.string().url(),quote:z.string().min(1)})),
})
export type QuestionCard=z.infer<typeof questionCardSchema>&{decision:"accept"|"revise"|"reject";critique:string;suggestedQuery?:string|null}
/** Product brands provide context; only approved measurement targets may receive credit. */
export function scopedQuestionCardSchema(map:BusinessMap){
 const entities=map.entities.filter(e=>map.scope.some(s=>s.entityId===e.id))
 const entityIds=entities.map(e=>e.id),audienceIds=[...new Set(map.scope.map(s=>s.audienceId))]
 const names=[...new Set(entities.flatMap(e=>[e.name,...(e.aliases??[])]))]
 if(!entityIds.length||!audienceIds.length||!names.length)throw Error("Нет утверждённых целей измерения")
 return questionCardSchema.extend({entityId:z.enum(entityIds),audienceId:z.enum(audienceIds),mentionRule:questionCardSchema.shape.mentionRule.extend({names:z.array(z.enum(names)).min(1)})})
}
export const QUESTION_TARGET_RULES=`Цель измерения выбирается ТОЛЬКО из scope: entityId, audienceId и metric должны соответствовать одному утверждённому направлению. Для seller целевая сущность — магазин, expectedAnswer=sellers, names — имя магазина и его утверждённые aliases. Производители, марки и модели продаваемых товаров — контекст выбора, а не целевые сущности. Например, в вопросе о покупке Xbox измеряется рекомендация выбранного магазина, не упоминание Xbox. Не подменяй цель измерения товарным брендом. Для company ищем компании, для owned-product — собственные продукты. Условия покупки (гарантия, доставка, скидка) допустимы внутри релевантной потребности, они не обязаны дословно повторять её название. Вопрос о магазинах со скидкой допустим, если ожидается рекомендация продавца. Общая справка о товаре без выбора продавца не подходит для seller.`
export function cardsVersion(queries:string[],map:BusinessMap){return createHash("sha256").update(JSON.stringify({queries,map:mapHash(map),version:"question-cards-v1"})).digest("hex")}
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
  const sources=[...map.entities,...map.relationships.filter(r=>r.enabled!==false),...map.audiences,...map.geography].flatMap(x=>x.sources)
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
