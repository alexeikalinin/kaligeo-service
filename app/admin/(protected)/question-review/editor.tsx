"use client"
import type { QuestionCard } from "@/lib/questions/question-cards"
import { useRef, useEffect, useState } from "react"

const button = "rounded-lg border border-[#D3D5CC] bg-white px-4 py-2.5 text-sm font-medium hover:bg-[#F2F1EB] disabled:opacity-40"
const field = "w-full rounded-lg border border-[#D3D5CC] bg-white p-3 text-sm text-[#0F1115]"

export default function Editor({id,queries,version,initialNotes,initialCards=[]}:{id:string;queries:string[];version:string;initialNotes:string;initialCards?:QuestionCard[]}) {
 const [selected,setSelected]=useState<number[]>([])
 const [cards,setCards]=useState(initialCards)
 const [questions,setQuestions]=useState(queries)
 const [savedQuestions,setSavedQuestions]=useState(queries)
 const [notes,setNotes]=useState(initialNotes)
 const [hash,setHash]=useState(version)
 const [message,setMessage]=useState("")
 const [busy,setBusy]=useState(false)
 const listRef=useRef<HTMLOListElement>(null)
 useEffect(()=>{
  const resize=()=>listRef.current?.querySelectorAll("textarea").forEach(element=>{element.style.height="auto";element.style.height=`${element.scrollHeight}px`})
  window.addEventListener("resize",resize)
  return()=>window.removeEventListener("resize",resize)
 },[])
 const selectAllRef=useRef<HTMLInputElement>(null)
 const allSelected=questions.length>0&&selected.length===questions.length
 useEffect(()=>{if(selectAllRef.current)selectAllRef.current.indeterminate=selected.length>0&&!allSelected},[selected.length,allSelected])
 const dirty=JSON.stringify(questions)!==JSON.stringify(savedQuestions)
 const accepted=questions.filter(q=>cards.some(c=>c.query===q&&c.decision==="accept")).length
 function edit(index:number,value:string){setQuestions(current=>current.map((q,i)=>i===index?value:q))}
 async function submit(action:string){
  setBusy(true)
  setMessage("")
  try{
   async function request(nextAction:string,nextHash:string,nextQueries:string[]){
    const response=await fetch(`/api/admin/jobs/${id}/questions`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:nextAction,version:nextHash,queries:nextQueries,notes,indexes:selected})})
    const data=await response.json();if(!response.ok)throw Error(data.error);return data
   }
   const data=await request(action,hash,questions)
   setHash(data.hash)
   let nextQueries=questions
   if(action==="save"){setCards([]);setSavedQuestions(questions)}
   if(data.regenerated){nextQueries=data.queries;setQuestions(nextQueries);setSavedQuestions(nextQueries);setCards([]);setSelected([])}
   if(action==="save"||data.regenerated){
    setMessage("Правки сохранены. ИИ проверяет вопросы…")
    const reviewed=await request("review",data.hash,nextQueries)
    setCards(reviewed.cards)
    setMessage("Проверка завершена. Если есть замечания, они показаны под вопросами.")
   }else{
    if(data.cards)setCards(data.cards)
    setMessage(data.approved?"Вопросы утверждены, аудит поставлен в очередь.":"Проверка завершена.")
   }
  }catch(e){setMessage(e instanceof Error?e.message:String(e))}finally{setBusy(false)}
 }
 return <div className="space-y-5">
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F2F1EB] p-4 text-sm"><div><strong>{questions.length} вопросов</strong><span className="mx-3 text-[#6A6D75]">·</span>Проверку ИИ прошли: {accepted}</div><span className="rounded-full bg-white px-3 py-1 text-[#6A6D75]">Ожидают вашего утверждения</span></div>
  <p className="text-sm text-[#6A6D75]">Редактируйте формулировки в списке. Отметьте вопросы для переработки или одобрите весь список кнопкой внизу.</p>
  <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><label className="flex items-center gap-2 font-medium"><input ref={selectAllRef} type="checkbox" aria-label="Выбрать все вопросы" checked={allSelected} onChange={e=>setSelected(e.target.checked?questions.map((_,i)=>i):[])}/>Выбрать все</label><span className="text-[#6A6D75]">Выбрано: {selected.length} из {questions.length}</span></div>
  <ol ref={listRef} aria-label="Список вопросов" className="divide-y divide-[#E5E5E1] overflow-hidden rounded-xl border border-[#E5E5E1] bg-white">
   {questions.map((query,i)=>{
    const card=cards.find(c=>c.query===query)
    return <li key={i} className={`review-question flex-wrap flex min-w-0 items-start gap-2 px-3 py-2 sm:gap-3 ${selected.includes(i)?"bg-[#F6FAED]":"bg-white"}`}>
     <input className="mt-2 shrink-0" type="checkbox" checked={selected.includes(i)} onChange={e=>setSelected(current=>e.target.checked?[...current,i]:current.filter(n=>n!==i))} aria-label={`Выбрать вопрос ${i+1}`}/>
     <span className="w-6 shrink-0 pt-1.5 text-sm tabular-nums text-[#6A6D75]" aria-hidden="true">{String(i+1).padStart(2,"0")}.</span>
     <textarea disabled={busy} aria-label={`Вопрос ${i+1}`} value={query} onChange={e=>edit(i,e.target.value)} ref={element=>{if(element){element.style.height="auto";element.style.height=`${element.scrollHeight}px`}}} rows={1} className="review-question-input min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm leading-6 text-[#0F1115] hover:border-[#E5E5E1] focus:border-[#87A62E] focus:bg-white" />
     {card?.decision!=="accept"&&<span className="shrink-0 pt-2 text-xs text-[#6A6D75]" title={card?"Требует внимания":"Нужна проверка"} aria-label={card?"Требует внимания":"Нужна проверка"}>!</span>}
     {card&&card.decision!=="accept"&&<p className="w-full pl-12 text-xs text-[#854D0E]">Нужно исправить: {card.critique}</p>}
    </li>
   })}
  </ol>
  <div className="space-y-3 rounded-xl border border-[#E5E5E1] bg-[#F2F1EB] p-4"><label className="block text-sm font-semibold" htmlFor={`notes-${id}`}>Замечания к вопросам</label><textarea id={`notes-${id}`} aria-label="Замечания проверяющего" placeholder="Что изменить в выбранных вопросах и почему" rows={3} className={field} value={notes} onChange={e=>setNotes(e.target.value)}/><div className="flex flex-wrap items-center gap-3"><button disabled={busy||dirty||!selected.length||!notes.trim()} onClick={()=>submit("regenerate")} className={button}>Переработать выбранные{selected.length?` · ${selected.length}`:""}</button><span className="text-xs text-[#6A6D75]">После переработки проверка выполнится автоматически. Переработка использует ИИ.</span></div></div>

  <div className="sticky bottom-3 z-10 space-y-3 rounded-xl border border-[#D3D5CC] bg-[#FAFAF7]/95 p-4 shadow-sm backdrop-blur"><div className="flex flex-wrap gap-3"><button disabled={busy||!dirty} onClick={()=>submit("save")} className={button}>Сохранить и проверить</button>{!dirty&&cards.length===0&&<button disabled={busy} onClick={()=>submit("review")} className={button}>Повторить проверку после сбоя</button>}<button disabled={busy||dirty||accepted!==questions.length||!questions.length} onClick={()=>submit("approve")} className="rounded-lg bg-[#C8F24A] px-5 py-2.5 text-sm font-semibold text-[#0F1115] hover:bg-[#B9E437] disabled:opacity-40">Одобрить все вопросы и начать аудит</button></div><p role="status" aria-live="polite" className="text-sm text-[#6A6D75]">{busy?(message||"ИИ проверяет вопросы…"):message|| (dirty?"Есть несохранённые изменения. При сохранении проверка ИИ запустится автоматически.":accepted!==questions.length?`Запуск недоступен: требуют проверки или исправления ${questions.length-accepted} из ${questions.length} вопросов. Причины указаны под вопросами.`:"Все вопросы проверены. Можно одобрить список и начать аудит.")}</p>{!busy&&!dirty&&accepted!==questions.length&&<p className="text-sm text-[#854D0E]">Для запуска нужно исправить или проверить {questions.length-accepted} вопросов. Причины указаны под ними.</p>}</div>
 </div>
}
