"use client"
import type { QuestionCard } from "@/lib/questions/question-cards"
import { useRef, useEffect, useState } from "react"

const button = "rounded-lg border border-[#D3D5CC] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#F2F1EB] disabled:opacity-40"
const field = "w-full rounded-lg border border-[#D3D5CC] bg-white p-3 text-sm text-[#0F1115]"

export default function Editor({id,queries,version,initialNotes,initialCards=[],failed=false}:{failed?:boolean;id:string;queries:string[];version:string;initialNotes:string;initialCards?:QuestionCard[]}) {
 const [budget,setBudget]=useState("")
 const [selected,setSelected]=useState<number[]>([])
 const [cards,setCards]=useState(initialCards)
 const [questions,setQuestions]=useState(queries)
 const [savedQuestions,setSavedQuestions]=useState(queries)
 const [notes,setNotes]=useState(initialNotes)
 const [hash,setHash]=useState(version)
 const [message,setMessage]=useState("")
 const [busy,setBusy]=useState(false)
 const selectAllRef=useRef<HTMLInputElement>(null)
 const allSelected=questions.length>0&&selected.length===questions.length
 useEffect(()=>{if(selectAllRef.current)selectAllRef.current.indeterminate=selected.length>0&&!allSelected},[selected.length,allSelected])
 const dirty=JSON.stringify(questions)!==JSON.stringify(savedQuestions)
 const accepted=questions.filter(q=>cards.some(c=>c.query===q&&c.decision==="accept")).length
 function edit(index:number,value:string){setQuestions(current=>current.map((q,i)=>i===index?value:q))}
 async function submit(action:string){
  setBusy(true)
  try{
   const r=await fetch(`/api/admin/jobs/${id}/questions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,version:hash,queries:questions,notes,indexes:selected,budgetUsd:budget})})
   const data=await r.json();if(!r.ok)throw Error(data.error)
   setHash(data.hash)
   if(action==="save"){setCards([]);setSavedQuestions(questions)}
   if(data.cards)setCards(data.cards)
   if(data.regenerated){setQuestions(data.queries);setSavedQuestions(data.queries);setCards([]);setSelected([])}
   setMessage(data.regenerated?"Выбранные вопросы переработаны. Изучите изменения и запустите проверку.":data.reviewed?"Проверка завершена. Изучите решения по каждому вопросу.":data.approved?"Вопросы утверждены, аудит поставлен в очередь.":"Правки сохранены. Проверьте список перед утверждением.")
  }catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F2F1EB] p-4 text-sm"><div><strong>{questions.length} вопросов</strong><span className="mx-3 text-[#6A6D75]">·</span>Проверку ИИ прошли: {accepted}</div><span className="rounded-full bg-white px-3 py-1 text-[#6A6D75]">Ожидают вашего утверждения</span></div>
  <p className="text-sm text-[#6A6D75]">Редактируйте формулировки в списке. Отметьте вопросы для переработки или одобрите весь список кнопкой внизу.</p>
  <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 font-medium"><input ref={selectAllRef} type="checkbox" aria-label="Выбрать все вопросы" checked={allSelected} onChange={e=>setSelected(e.target.checked?questions.map((_,i)=>i):[])}/>Выбрать все</label><span className="text-[#6A6D75]">Выбрано: {selected.length} из {questions.length}</span></div>
  <ol aria-label="Список вопросов" className="divide-y divide-[#E5E5E1] overflow-hidden rounded-xl border border-[#E5E5E1] bg-white">
   {questions.map((query,i)=>{
    const card=cards.find(c=>c.query===query)
    return <li key={i} className={`review-question min-w-0 space-y-2 p-4 ${selected.includes(i)?"bg-[#F6FAED]":"bg-white"}`}>
     <div className="flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={selected.includes(i)} onChange={e=>setSelected(current=>e.target.checked?[...current,i]:current.filter(n=>n!==i))} aria-label={`Выбрать вопрос ${i+1}`}/>Вопрос {String(i+1).padStart(2,"0")}</label><span className={`rounded-full px-2.5 py-1 text-xs ${card?.decision==="accept"?"bg-[#EAF4E8] text-[#21633D]":"bg-[#F2F1EB] text-[#6A6D75]"}`}>{card?.decision==="accept"?"Проверен ИИ":card?"Требует внимания":"Нужна проверка"}</span></div>
     <textarea aria-label={`Вопрос ${i+1}`} value={query} onChange={e=>edit(i,e.target.value)} rows={2} className={`${field} leading-relaxed`} />
     {card&&<details className="text-sm"><summary className="text-[#6A6D75]">Обоснование и источники</summary><div className="mt-3 space-y-3 border-t border-[#E5E5E1] pt-3 leading-relaxed"><p>{card.critique}</p><p><strong>Потребность:</strong> {card.need}</p><p><strong>Ожидаемый ответ:</strong> {card.expectedAnswer}</p><p>{card.rationale}</p><p><strong>Что засчитываем:</strong> {card.mentionRule.names.join(", ")} — {card.mentionRule.explanation}</p>{card.suggestedQuery&&<div><p>{card.suggestedQuery}</p><button className={`${button} mt-2`} onClick={()=>edit(i,card.suggestedQuery!)}>Применить предложение</button></div>}{card.evidence.map((e,j)=><blockquote key={j} className="border-l-2 border-[#C8F24A] pl-3 text-[#6A6D75]"><a className="break-all underline" href={e.url} rel="noreferrer" target="_blank">{e.url}</a><p>{e.quote}</p></blockquote>)}</div></details>}
    </li>
   })}
  </ol>
  <div className="space-y-3 rounded-xl border border-[#E5E5E1] bg-[#F2F1EB] p-4"><label className="block text-sm font-semibold" htmlFor={`notes-${id}`}>Замечания к вопросам</label><textarea id={`notes-${id}`} aria-label="Замечания проверяющего" placeholder="Что изменить в выбранных вопросах и почему" rows={3} className={field} value={notes} onChange={e=>setNotes(e.target.value)}/><div className="flex flex-wrap items-center gap-3"><button disabled={busy||dirty||!selected.length||!notes.trim()} onClick={()=>submit("regenerate")} className={button}>Переработать выбранные{selected.length?` · ${selected.length}`:""}</button><span className="text-xs text-[#6A6D75]">Сначала сохраните правки. Переработка использует ИИ.</span></div></div>
  <details className="rounded-xl border border-[#E5E5E1] bg-white p-4 text-sm"><summary className="text-[#6A6D75]">Дополнительные настройки и повторный запуск</summary><div className="mt-4 space-y-3"><label className="block">Оценочный бюджет аудита, USD (необязательно)<input aria-label="Оценочный бюджет аудита" type="number" min="0.01" step="0.01" value={budget} onChange={e=>setBudget(e.target.value)} className={`${field} mt-2 max-w-48 block`}/></label><p className="text-[#6A6D75]">Необязательная защита от перерасхода: перед очередным запросом сервис сверяет оценочные расходы аудита с этой суммой. Если суммы не хватает, запрос не отправляется и аудит останавливается. Это не баланс API и не точный лимит списаний: стоимость может быть неизвестна или отличаться от оценки. Оставьте поле пустым, если порог не нужен.</p><button disabled={busy||dirty} onClick={()=>submit("launch")} className={button}>Повторить запуск утверждённой версии</button>{failed&&<button disabled={busy||dirty} className={button} onClick={()=>submit("resume")}>Продолжить сохранённый аудит</button>}</div></details>
  <div className="sticky bottom-3 z-10 space-y-3 rounded-xl border border-[#D3D5CC] bg-[#FAFAF7]/95 p-4 shadow-sm backdrop-blur"><div className="flex flex-wrap gap-3"><button disabled={busy||!dirty} onClick={()=>submit("save")} className={button}>Сохранить правки</button><button disabled={busy||dirty} onClick={()=>submit("review")} className={button}>Проверить сохранённые вопросы</button><button disabled={busy||dirty||accepted!==questions.length||!questions.length} onClick={()=>submit("approve")} className="rounded-lg bg-[#C8F24A] px-5 py-2.5 text-sm font-semibold text-[#0F1115] hover:bg-[#B9E437] disabled:opacity-40">Одобрить все вопросы и начать аудит</button></div><p role="status" aria-live="polite" className="text-sm text-[#6A6D75]">{busy?"Выполняется…":message|| (dirty?"Есть несохранённые изменения. После сохранения повторите проверку ИИ.":"Опрос ИИ начнётся только после вашего утверждения.")}</p></div>
 </div>
}
