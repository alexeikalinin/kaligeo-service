import fs from 'node:fs';import dotenv from 'dotenv';import {configure,tasks,runs} from '@trigger.dev/sdk/v3';
const env={};for(const f of ['.env','.env.local','.env.keys.local'])if(fs.existsSync(f))Object.assign(env,dotenv.parse(fs.readFileSync(f)));
if(!env.TRIGGER_PROD_SECRET_KEY?.startsWith('tr_prod_'))throw Error('Production key required');configure({accessToken:env.TRIGGER_PROD_SECRET_KEY});
const platforms=['CHATGPT','GEMINI','YANDEXGPT','PERPLEXITY','DEEPSEEK','ALISA','GROK'];
const run=await tasks.trigger('platform-health-check',{platforms,force:true});
console.log(JSON.stringify({runId:run.id,platforms}));
const result=await runs.poll(run.id,{pollIntervalMs:1000});
const receipt={runId:run.id,status:result.status,output:result.output};
fs.writeFileSync('/private/tmp/kaligeo-live-platform-check.json',JSON.stringify(receipt,null,2),{mode:0o600});console.log(JSON.stringify(receipt));if(result.status!=='COMPLETED')process.exitCode=1;
