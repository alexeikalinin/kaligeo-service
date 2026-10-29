export function reviewFeedback(snapshot:Record<string,unknown>){
 const history=Array.isArray(snapshot.questionFeedback)?snapshot.questionFeedback:[]
 const approved=history.flatMap(event=>{
  if(!event||typeof event!=="object"||event.action!=="approve"||!Array.isArray(event.after))return[]
  return[{notes:String(event.notes??"").slice(0,2000),questions:event.after.filter((q:unknown)=>typeof q==="string").slice(0,50)}]
 }).slice(-3)
 const review=snapshot.questionReview as {notes?:unknown}|undefined
 const mapReview=snapshot.businessMapReview as {notes?:unknown}|undefined
 return {...(typeof mapReview?.notes==="string"?{businessMapReviewerNotes:mapReview.notes.slice(0,5000)}:{}),reviewerNotes:typeof review?.notes==="string"?review.notes.slice(0,5000):"",approvedExamples:approved}
}
