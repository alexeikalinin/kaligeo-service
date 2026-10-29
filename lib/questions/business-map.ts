import { createHash } from "node:crypto"
import { z } from "zod"
export const sourceSchema = z.object({ url: z.string().url(), quote: z.string().min(1).max(2000) })
export const businessMapSchema = z.object({
  entities: z.array(z.object({ id:z.string().min(1),name:z.string().min(1),kind:z.enum(["company","brand","product","service","category"]),attributes:z.array(z.string()),aliases:z.array(z.string().min(1)).optional(),sources:z.array(sourceSchema),confidence:z.enum(["supported","uncertain"]),clarification:z.string().max(4000).optional()})).max(100),
  relationships:z.array(z.object({from:z.string(),to:z.string(),role:z.enum(["owns","develops","publishes","sells","provides","belongs_to"]),enabled:z.boolean().optional(),sources:z.array(sourceSchema),confidence:z.enum(["supported","uncertain"]),clarification:z.string().max(4000).optional()})).max(150),
  audiences:z.array(z.object({id:z.string(),name:z.string(),needs:z.array(z.string()),entityIds:z.array(z.string()),sources:z.array(sourceSchema),confidence:z.enum(["supported","uncertain"]),clarification:z.string().max(4000).optional()})).max(30),
  geography:z.array(z.object({name:z.string(),sources:z.array(sourceSchema),confidence:z.enum(["supported","uncertain"])})),
  scope:z.array(z.object({entityId:z.string(),audienceId:z.string(),metric:z.enum(["company","owned-product","seller"]),rationale:z.string()})),
  unknowns:z.array(z.string()),
})
export type BusinessMap = z.infer<typeof businessMapSchema>
export interface SourceDocument {url:string;text:string}
export function mapHash(map:BusinessMap){return createHash("sha256").update(JSON.stringify(validateBusinessMap(map))).digest("hex")}
export function validateBusinessMap(raw:unknown):BusinessMap {
 const m=businessMapSchema.parse(raw), ids=new Set(m.entities.map(e=>e.id)), audiences=new Set(m.audiences.map(a=>a.id))
 if(ids.size!==m.entities.length||audiences.size!==m.audiences.length)throw Error("Повторяются идентификаторы карты")
 for(const r of m.relationships)if(!ids.has(r.from)||!ids.has(r.to)||r.from===r.to)throw Error("Некорректная связь сущностей")
 for(const a of m.audiences)if(a.entityIds.some(id=>!ids.has(id)))throw Error("Аудитория ссылается на неизвестный продукт")
 if(new Set(m.scope.map(s=>`${s.entityId}|${s.audienceId}|${s.metric}`)).size!==m.scope.length)throw Error("Повторяются направления аудита")
 for(const s of m.scope)if(!ids.has(s.entityId)||!audiences.has(s.audienceId))throw Error("Некорректное направление аудита")
 return m
}
export function groundBusinessMap(raw:unknown,documents:SourceDocument[]):BusinessMap {
 const m=validateBusinessMap(raw)
 for(const item of [...m.entities,...m.relationships,...m.audiences,...m.geography]){
  item.sources=item.sources.filter(s=>documents.some(d=>d.url===s.url&&d.text.includes(s.quote)))
  if(!item.sources.length)item.confidence="uncertain"
 }
 return m
}
export function assertReviewableMap(m:BusinessMap){
 validateBusinessMap(m)
 if(!m.scope.length)throw Error("Выберите хотя бы одно направление аудита")
 for(const s of m.scope){const e=m.entities.find(e=>e.id===s.entityId)!,a=m.audiences.find(a=>a.id===s.audienceId)!
  if(e.confidence!=="supported"||a.confidence!=="supported")throw Error("Уточните неподтверждённые сущности и аудитории выбранного направления")
  if(s.metric==="seller"&&!["company","brand"].includes(e.kind))throw Error("Для метрики продавца выберите компанию или бренд продавца; категория товара не является продавцом")
  if(s.metric==="company"&&!["company","brand"].includes(e.kind))throw Error("Корпоративная метрика требует компанию или бренд")
  if(s.metric==="owned-product"&&!m.relationships.some(r=>r.to===e.id&&["owns","develops","publishes"].includes(r.role)&&r.confidence==="supported"&&r.enabled!==false))throw Error("Для продуктовой метрики подтвердите связь с компанией")
 }
}

export function activeBusinessMap(map:BusinessMap):BusinessMap{return {...map,relationships:map.relationships.filter(r=>r.enabled!==false)}}

export function questionBusinessMap(map:BusinessMap):BusinessMap{
 const active=activeBusinessMap(map)
 const audiences=active.audiences.filter(a=>active.scope.some(s=>s.audienceId===a.id))
 const ids=new Set(active.scope.map(s=>s.entityId))
 for(const audience of audiences)if(active.scope.some(s=>s.audienceId===audience.id&&s.metric!=="owned-product"))for(const id of audience.entityIds)ids.add(id)
 for(const relation of active.relationships)if(ids.has(relation.to)&&["owns","develops","publishes"].includes(relation.role))ids.add(relation.from)
 return {...active,entities:active.entities.filter(e=>ids.has(e.id)),audiences:audiences.map(a=>({...a,entityIds:a.entityIds.filter(id=>ids.has(id))})),relationships:active.relationships.filter(r=>ids.has(r.from)&&ids.has(r.to))}
}
