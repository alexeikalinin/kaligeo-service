import fs from 'node:fs';
import dotenv from 'dotenv';
const env={};
for(const f of ['.env','.env.local','.env.keys.local'])if(fs.existsSync(f))Object.assign(env,dotenv.parse(fs.readFileSync(f)));
const token=env.ADMIN_SESSION_TOKEN;
if(!token||token.includes('SENSITIVE'))throw Error('Usable admin session unavailable');
const root='https://app.kaligeo.by';
for(const path of ['/admin/question-review','/admin/usage']){
 const r=await fetch(root+path,{headers:{Cookie:`admin_session=${token}`},redirect:'manual'});
 const html=await r.text();
 const expected=path.includes('question-review')?'Проверка вопросов':'Расходы по аудитам';
 console.log(JSON.stringify({path,status:r.status,expectedText:html.includes(expected)}));
 if(r.status!==200||!html.includes(expected))process.exitCode=1;
}
const r=await fetch(root+'/api/admin/jobs/nonexistent/questions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve'})});
console.log(JSON.stringify({check:'anonymous-approval-blocked',status:r.status}));if(r.status!==401)process.exitCode=1;
