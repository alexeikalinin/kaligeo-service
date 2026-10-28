import fs from 'node:fs';import dotenv from 'dotenv';import {configure,runs} from '@trigger.dev/sdk/v3';import {saveLocal} from '../save-keys.mjs';
const env={};for(const f of ['.env','.env.local','.env.keys.local'])if(fs.existsSync(f))Object.assign(env,dotenv.parse(fs.readFileSync(f)));
if(process.argv[2]){if(!/^run_[a-z0-9]+$/.test(process.argv[2]))throw Error('Invalid development run id');configure({accessToken:env.TRIGGER_SECRET_KEY});await runs.cancel(process.argv[2]);}
const config=JSON.parse(fs.readFileSync('/Users/alexei.kalinin/Library/Preferences/trigger/config.json'));
const profile=config.profiles[config.currentProfile??'default'];
const response=await fetch(`${profile.apiUrl}/api/v1/projects/proj_xqiwghrbsmrggjmorcyh/prod`,{headers:{Authorization:`Bearer ${profile.accessToken}`}});
if(!response.ok)throw Error(`Environment configuration request failed: ${response.status}`);
const data=await response.json();if(!data.apiKey?.startsWith('tr_prod_'))throw Error('Production key validation failed');
saveLocal('.env.keys.local',{TRIGGER_PROD_SECRET_KEY:data.apiKey});
console.log(JSON.stringify({saved:'.env.keys.local',name:'TRIGGER_PROD_SECRET_KEY',environment:'production',developmentCheckCancelled:!!process.argv[2]}));
