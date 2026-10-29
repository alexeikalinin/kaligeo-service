import {mapHash,type BusinessMap} from "../questions/business-map"
import type { QuestionCard } from "../questions/question-cards"
import { createHash } from "node:crypto"
export interface EntityAnswer {id:string;query:string;platform:string;response:string}
export interface EntityMeasurement {entityId:string;audienceId:string;audienceName:string;name:string;metric:string;answers:number;mentions:number;rate:number|null;platforms:{platform:string;answers:number;mentions:number;rate:number}[];evidence:{answerId:string;platform:string;query:string;name:string;quote:string}[]}
export function literalMention(text:string,name:string):number{
 if(!name.trim())return -1
 const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")
 const match=new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped})(?=$|[^\\p{L}\\p{N}])`,"iu").exec(text)
 return match ? match.index+match[1].length : -1
}
export function measureEntities(rows:EntityAnswer[],cards:QuestionCard[],map:BusinessMap):EntityMeasurement[]{
 const unique=[...new Map(rows.map(r=>[`${r.platform}\0${r.query}`,r])).values()]
 return map.scope.map(scope=>{
  const entity=map.entities.find(e=>e.id===scope.entityId)!
  const eligible=cards.filter(c=>c.decision==="accept"&&c.entityId===scope.entityId&&c.audienceId===scope.audienceId&&c.mentionRule.metric===scope.metric)
  const samples=unique.filter(r=>eligible.some(c=>c.query===r.query))
  const evidence=samples.flatMap(r=>{
   const c=eligible.find(c=>c.query===r.query)!
   // Only explicitly approved names; no model-invented aliases or industry inference.
   const match=c.mentionRule.names.map(name=>({name,index:literalMention(r.response,name)})).find(x=>x.index>=0)
   return match?[{answerId:r.id,platform:r.platform,query:r.query,name:match.name,quote:r.response.slice(Math.max(0,match.index-100),match.index+match.name.length+180)}]:[]
  })
  const platforms=[...new Set(samples.map(r=>r.platform))].map(platform=>{const answers=samples.filter(r=>r.platform===platform).length,mentions=evidence.filter(e=>e.platform===platform).length;return{platform,answers,mentions,rate:Math.round(100*mentions/answers)}})
  return{entityId:entity.id,audienceId:scope.audienceId,audienceName:map.audiences.find(a=>a.id===scope.audienceId)?.name??scope.audienceId,name:entity.name,metric:scope.metric,answers:samples.length,mentions:evidence.length,rate:samples.length?Math.round(100*evidence.length/samples.length):null,platforms,evidence}
 })
}
export function measurementVersion(map:BusinessMap,cards:QuestionCard[]){return createHash("sha256").update(JSON.stringify({version:"entity-visibility-v1",map:mapHash(map),cards:cards.map(c=>({query:c.query,entityId:c.entityId,audienceId:c.audienceId,rule:c.mentionRule}))})).digest("hex")}

/** Summary denominator: one spontaneous answer, one relevant approved target. */
export function projectEntityAnswers<T extends EntityAnswer&{brandMentioned:boolean;positionScore:number;sentiment:string}>(rows:T[],cards:QuestionCard[]):T[]{
 return rows.flatMap(row=>{
  const card=cards.find(c=>c.query===row.query&&c.decision==="accept"&&c.mentionRule.metric!=="recognition")
  if(!card)return[]
  const indexes=card.mentionRule.names.map(n=>literalMention(row.response,n)).filter(i=>i>=0)
  const index=indexes.length?Math.min(...indexes):-1
  const position=index<0?0:index/Math.max(row.response.length,1)<0.15?1:index/row.response.length<0.33?2:index/row.response.length<0.67?3:4
  return[{...row,brandMentioned:index>=0,positionScore:position,sentiment:index>=0?"neutral":"absent"}]
 })
}
