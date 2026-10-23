// Trusted QA recovery only. Keeps saved answers; calls missing platforms, never banks/email.
import fs from 'node:fs'
import { configure, tasks } from '@trigger.dev/sdk/v3'
configure({ accessToken: fs.readFileSync('/private/tmp/kaligeo-qa-trigger-key', 'utf8').trim() })
const state = JSON.parse(fs.readFileSync('/private/tmp/kaligeo-tier-validation.json', 'utf8'))
const file = '/private/tmp/kaligeo-qa-recovery.json'
const recovery = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
const tag = process.env.QA_RECOVERY_TAG || "relay204"
for (const tier of process.argv.slice(2)) {
  if (recovery.some(item => item.tier === tier && (item.tag || "relay204") === tag)) continue
  const job = state.jobs.find(item => item.tier === tier)
  if (!job) throw new Error('Unknown QA tier')
  const run = await tasks.trigger('audit-pipeline', { jobId: job.jobId, validation: true, resume: true }, { idempotencyKey: `qa-resume-${job.jobId}-${tag}` })
  recovery.push({ tier, tag, jobId: job.jobId, runId: run.id })
  fs.writeFileSync(file, JSON.stringify(recovery, null, 2), { mode: 0o600 })
  console.log(JSON.stringify({ tier, recoveryRun: run.id }))
}
