import {expect,it} from "vitest"
import {groundBusinessMap,validateBusinessMap,mapHash,assertReviewableMap}from"@/lib/questions/business-map"
const map={entities:[{id:"c",kind:"company",name:"Brand",attributes:[],sources:[{url:"https://example.com",quote:"Brand delivers flowers"}],confidence:"supported"}],relationships:[],audiences:[{id:"a",name:"Buyers",needs:["delivery"],entityIds:["c"],sources:[],confidence:"uncertain"}],geography:[],scope:[{entityId:"c",audienceId:"a",metric:"company",rationale:"find supplier"}],unknowns:[]}
it("rejects fabricated citations and marks unsupported audiences",()=>{const m=groundBusinessMap(map,[{url:"https://example.com",text:"Brand sells books"}]);expect(m.entities[0].sources).toEqual([]);expect(m.entities[0].confidence).toBe("uncertain");expect(()=>assertReviewableMap(m)).toThrow()})
it("keeps exact page evidence and stable revision",()=>{const m=groundBusinessMap(map,[{url:"https://example.com",text:"Brand delivers flowers"}]);expect(m.entities[0].confidence).toBe("supported");expect(mapHash(m)).not.toBe(mapHash({...m,unknowns:["new"]}))})
it("rejects relationships to invented entity identifiers",()=>{expect(()=>validateBusinessMap({...map,relationships:[{from:"c",to:"unknown",role:"sells",sources:[],confidence:"uncertain"}]})).toThrow()})

it("does not measure a product category as the seller",()=>{const m=validateBusinessMap({...map,entities:[{...map.entities[0],kind:"category"}],audiences:[{...map.audiences[0],confidence:"supported"}],scope:[{...map.scope[0],metric:"seller"}]});expect(()=>assertReviewableMap(m)).toThrow("категория товара не является продавцом")})

it("keeps disabled relationships in the revision but excludes them from AI context",async()=>{
 const {activeBusinessMap}=await import("@/lib/questions/business-map")
 const m=validateBusinessMap({...map,entities:[...map.entities,{...map.entities[0],id:"p",kind:"product"}],relationships:[{from:"c",to:"p",role:"develops",enabled:false,sources:[],confidence:"supported"}]})
 expect(m.relationships).toHaveLength(1)
 expect(activeBusinessMap(m).relationships).toHaveLength(0)
 expect(mapHash(m)).not.toBe(mapHash({...m,relationships:m.relationships.map(r=>({...r,enabled:true}))}))
})
it("does not allow disabled ownership as evidence for product measurement",()=>{
 const m=validateBusinessMap({...map,entities:[...map.entities,{...map.entities[0],id:"p",kind:"product"}],audiences:[{...map.audiences[0],confidence:"supported"}],relationships:[{from:"c",to:"p",role:"develops",enabled:false,sources:[],confidence:"supported"}],scope:[{...map.scope[0],entityId:"p",metric:"owned-product"}]})
 expect(()=>assertReviewableMap(m)).toThrow("подтвердите связь")
})

it("persists addressed clarification in the map revision without promoting uncertain facts",()=>{
 const m=validateBusinessMap({...map,entities:[{...map.entities[0],confidence:"uncertain",clarification:"Уточнить модель бизнеса\nНе смешивать продажи и производство"}],audiences:[{...map.audiences[0],clarification:"Ищут место покупки"}]})
 expect(m.entities[0].clarification).toContain("\n")
 expect(m.entities[0].confidence).toBe("uncertain")
 expect(mapHash(m)).not.toBe(mapHash(validateBusinessMap(map)))
 expect(()=>assertReviewableMap(m)).toThrow()
})

it("keeps approval hash stable through JSONB property reordering",()=>{
 const original=validateBusinessMap(map)
 const reorder=(value:unknown):unknown=>Array.isArray(value)?value.map(reorder):value&&typeof value==="object"?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reorder(v)])):value
 expect(mapHash(reorder(original) as typeof original)).toBe(mapHash(original))
})

it("limits question context to selected audiences and their offers",async()=>{
 const {questionBusinessMap}=await import("@/lib/questions/business-map")
 const m=validateBusinessMap({...map,entities:[...map.entities,{...map.entities[0],id:"service",kind:"service",name:"Repair"}],audiences:[{...map.audiences[0],entityIds:["c"]},{...map.audiences[0],id:"repair",entityIds:["service"]}],relationships:[{from:"c",to:"service",role:"provides",sources:[],confidence:"supported"}]})
 const context=questionBusinessMap(m)
 expect(context.audiences.map(a=>a.id)).toEqual(["a"])
 expect(context.entities.map(e=>e.id)).not.toContain("service")
 expect(context.relationships).toHaveLength(0)
})
