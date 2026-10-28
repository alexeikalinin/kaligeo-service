import fs from 'node:fs';import dotenv from 'dotenv';import {configure,runs} from '@trigger.dev/sdk/v3';
const env={};for(const f of ['.env','.env.local','.env.keys.local'])if(fs.existsSync(f))Object.assign(env,dotenv.parse(fs.readFileSync(f)));
if(!env.TRIGGER_PROD_SECRET_KEY?.startsWith("tr_prod_"))throw Error("Production key required");
configure({accessToken:env.TRIGGER_PROD_SECRET_KEY});
const id=process.argv[2];if(!/^run_[a-z0-9]+$/.test(id??''))throw Error('run id required');
const r=await runs.retrieve(id);console.log(JSON.stringify({id:r.id,status:r.status,version:r.version,error:r.error,output:r.output}));
