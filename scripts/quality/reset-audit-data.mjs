/** One-off operator command. Dry run by default; --execute requires explicit authorization. */
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import {createJiti} from 'jiti';
import {configure,runs} from '@trigger.dev/sdk/v3';
import {list,del} from '@vercel/blob';
const execute=process.argv.includes('--execute');
for(const f of ['.env','.env.local','.env.keys.local'])if(fs.existsSync(f))Object.assign(process.env,dotenv.parse(fs.readFileSync(f)));
if(!process.env.TRIGGER_PROD_SECRET_KEY?.startsWith('tr_prod_'))throw Error('Production Trigger key required');
configure({accessToken:process.env.TRIGGER_PROD_SECRET_KEY});
const {prisma}=await createJiti(import.meta.url).import(path.resolve('lib/prisma.ts'));
const auditTasks=['audit-pipeline','post-audit-sequence','send-freemium-sequence','follow-up-scheduler','monitoring-spot-check','monitoring-alerts','monitor-digest','renewal-reminder','subscription-billing','contact-scan'];
const activeStates=['PENDING_VERSION','QUEUED','DEQUEUED','EXECUTING','WAITING','DELAYED'];
async function activeRuns(){const result=[];for await(const r of runs.list({status:activeStates,taskIdentifier:auditTasks})){result.push({id:r.id,task:r.taskIdentifier});if(result.length>1000)throw Error('Run cancellation scope unexpectedly large');}return result;}
async function counts(db){const names=['auditJob','report','queryResult','freemiumScan','brandProfile','telegramSession'];const values=await Promise.all(names.map(n=>db[n].count()));return Object.fromEntries(names.map((n,i)=>[n,values[i]]));}
try{
 const before=await counts(prisma),subscriptions=await prisma.subscription.count();
 // Billing records are not audit data; do not silently change any real subscription.
 if(subscriptions)throw Error('Subscription records exist: this reset is scoped to audit data only');
 const jobs=await prisma.auditJob.findMany({select:{id:true,pdfUrl:true}});
 const pending=await activeRuns();
 const blobToken=process.env.BLOB_READ_WRITE_TOKEN;
 if(!blobToken||blobToken.includes('SENSITIVE'))throw Error('Usable Blob key required to remove generated reports');
 const blobs=[];let cursor;
 do{const page=await list({prefix:'reports/',limit:1000,cursor,token:blobToken});blobs.push(...page.blobs.map(b=>b.url));cursor=page.hasMore?page.cursor:undefined;}while(cursor);
 const pdfs=[...new Set([...blobs,...jobs.map(j=>j.pdfUrl).filter(Boolean)])];
 if(pdfs.some(url=>!/^https:\/\/[^/]+\.blob\.vercel-storage\.com\/reports\//.test(url)))throw Error('Unexpected report storage scope');
 console.log(JSON.stringify({mode:execute?'execute':'dry-run',before,subscriptions,activeRuns:pending,reportFiles:pdfs.length}));
 if(!execute)process.exitCode=0;
 else{
  for(const r of pending){await runs.cancel(r.id);const fresh=await runs.retrieve(r.id);if(!['CANCELED','COMPLETED','FAILED','CRASHED','EXPIRED','TIMED_OUT','SYSTEM_FAILURE'].includes(fresh.status))throw Error('Old task is not stopped');}
  if((await activeRuns()).length)throw Error('An old audit task remains active; database not cleared');
  const deleted=await prisma.$transaction(async tx=>{
   await tx.$executeRawUnsafe('LOCK TABLE "AuditJob", "Report", "QueryResult", "FreemiumScan", "BrandProfile", "TelegramSession" IN ACCESS EXCLUSIVE MODE');
   await tx.auditJob.updateMany({data:{baselineJobId:null,followUpScheduledAt:null,recurringFrequency:null}});
   const answers=await tx.queryResult.deleteMany({}),reports=await tx.report.deleteMany({}),audits=await tx.auditJob.deleteMany({}),previews=await tx.freemiumScan.deleteMany({}),brands=await tx.brandProfile.deleteMany({}),telegram=await tx.telegramSession.deleteMany({});
   const accounts=await tx.client.updateMany({data:{trialUsed:false}});
   const after=await counts(tx);if(Object.values(after).some(n=>n!==0))throw Error('Reset postcondition failed');
   return {audits:audits.count,reports:reports.count,answers:answers.count,previews:previews.count,brands:brands.count,telegram:telegram.count,accountsPreservedAndTrialReset:accounts.count,after};
  },{timeout:60000});
  const receipt={at:new Date().toISOString(),...deleted,cancelledRuns:pending.map(r=>r.id),reportFiles:pdfs.length,reportFilesDeleted:false};
  fs.writeFileSync('/private/tmp/kaligeo-audit-reset-receipt.json',JSON.stringify(receipt,null,2),{mode:0o600});
  if(pdfs.length)await del(pdfs,{token:blobToken});
  receipt.reportFilesDeleted=true;fs.writeFileSync('/private/tmp/kaligeo-audit-reset-receipt.json',JSON.stringify(receipt,null,2),{mode:0o600});
  console.log(JSON.stringify(receipt));
 }
}finally{await prisma.$disconnect()}
