import fs from 'node:fs';import dotenv from 'dotenv';import {configure,runs} from '@trigger.dev/sdk/v3';
const env={};for(const f of ['.env','.env.local','.env.keys.local'])if(fs.existsSync(f))Object.assign(env,dotenv.parse(fs.readFileSync(f)));
if(!env.TRIGGER_PROD_SECRET_KEY?.startsWith('tr_prod_'))throw Error('Production Trigger key required');configure({accessToken:env.TRIGGER_PROD_SECRET_KEY});
const items=[];for await(const r of runs.list({status:['PENDING_VERSION','QUEUED','DEQUEUED','EXECUTING','WAITING','DELAYED']})){items.push({id:r.id,task:r.taskIdentifier,status:r.status});if(items.length>1000)throw Error('Too many active runs');}
console.log(JSON.stringify({active:items}));
