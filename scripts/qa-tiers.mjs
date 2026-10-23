// Operator-only acceptance run. Uses existing CLI credentials; never calls a bank or sends email.
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { createJiti } from 'jiti'
import { configure, tasks, runs } from '@trigger.dev/sdk/v3'

const statePath = process.env.QA_STATE_PATH || '/private/tmp/kaligeo-tier-validation.json'
const stateExists = fs.existsSync(statePath)
if (!stateExists && !process.env.QA_CLIENT_EMAIL) throw new Error('QA_CLIENT_EMAIL is required to create the validation jobs')
for (const file of ['.env', '.env.local']) Object.assign(process.env, dotenv.parse(fs.readFileSync(file)))
configure({ accessToken: fs.readFileSync('/private/tmp/kaligeo-qa-trigger-key', 'utf8').trim() })
const jiti = createJiti(import.meta.url)
const { prisma } = await jiti.import(path.resolve('lib/prisma.ts'))
const { TIER_CONFIG } = await jiti.import(path.resolve('lib/gates.ts'))
const save = state => fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 })
const terminal = new Set(['COMPLETED', 'FAILED', 'CANCELED', 'CRASHED', 'SYSTEM_FAILURE', 'TIMED_OUT', 'EXPIRED'])
try {
  let state
  if (stateExists) state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
  else {
    const client = await prisma.client.findUniqueOrThrow({ where: { email: process.env.QA_CLIENT_EMAIL } })
    const scan = await prisma.freemiumScan.findUniqueOrThrow({ where: { id: 'cmvkvk8d7000107jm2m0zg67m' } })
    state = { createdAt: new Date().toISOString(), jobs: [] }
    for (const tier of ['BASIC', 'STANDARD', 'ADVANCED', 'MONITOR_START', 'MONITOR_PRO', 'MONITOR_AGENT']) {
      const job = await prisma.auditJob.create({ data: {
        clientId: client.id, clientEmail: client.email, companyName: 'GamePark', websiteUrl: scan.websiteUrl,
        niche: scan.niche, competitors: scan.suggestedCompetitors.slice(0, 3), tier, market: 'by',
        source: 'qa-acceptance', adminNotes: 'Acceptance test. No payment, subscription binding, or notifications. Gemini and GigaChat excluded.',
        paidAt: null, emailOptOut: true, status: 'PENDING',
        selectedPlatforms: TIER_CONFIG[tier].platforms.filter(p => !['GEMINI', 'GIGACHAT'].includes(p)),
      } })
      state.jobs.push({ tier, jobId: job.id, runId: null, status: 'NOT_STARTED' })
      save(state)
    }
  }
  for (const item of state.jobs) {
    if (!item.runId) {
      const run = await tasks.trigger('audit-pipeline', { jobId: item.jobId, validation: true }, { idempotencyKey: `qa-${item.jobId}` })
      item.runId = run.id
      save(state)
      console.log(JSON.stringify({ tier: item.tier, runId: run.id, state: 'TRIGGERED' }))
    }
    for (;;) {
      const run = await runs.retrieve(item.runId)
      if (item.status !== run.status) {
        item.status = run.status
        save(state)
        console.log(JSON.stringify({ tier: item.tier, state: run.status }))
      }
      if (terminal.has(run.status)) {
        const job = await prisma.auditJob.findUniqueOrThrow({ where: { id: item.jobId }, include: { report: true, _count: { select: { queryResults: true } } } })
        item.summary = { jobStatus: job.status, score: job.report?.overallScore, platforms: job.selectedPlatforms,
          generatedQuestions: Array.isArray(job.generatedQueries) ? job.generatedQueries.length : 0,
          savedAnswers: job._count.queryResults, hasPdf: !!job.pdfUrl, hasAnalysis: !!job.report?.analysisNotes,
          hasContent: !!job.report?.contentRecommendations, paid: !!job.paidAt, error: job.errorMessage }
        save(state)
        console.log(JSON.stringify({ tier: item.tier, ...item.summary }))
        break
      }
      await new Promise(resolve => setTimeout(resolve, 15000))
    }
  }
  console.log('All six tariff runs reached a terminal state. Review summaries before declaring acceptance.')
} finally { await prisma.$disconnect() }
