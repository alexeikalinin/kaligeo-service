// Read-only acceptance checks against existing QA jobs. Never visits payment endpoints.
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { createJiti } from 'jiti'
Object.assign(process.env, dotenv.parse(fs.readFileSync('.env')))
const jiti = createJiti(import.meta.url)
const { prisma } = await jiti.import(path.resolve('lib/prisma.ts'))
const { getTierConfig } = await jiti.import(path.resolve('lib/gates.ts'))
const origin = 'https://app.kaligeo.by'
const results = []
try {
  const jobs = await prisma.auditJob.findMany({ where: { source: 'qa-acceptance', market: 'by' }, include: { report: true, _count: { select: { queryResults: true } } }, orderBy: { createdAt: 'asc' } })
  for (const job of jobs) {
    const config = getTierConfig(job.tier)
    const item = { tier: job.tier, status: job.status, paid: !!job.paidAt, answers: job._count.queryResults, expectedQuestions: config.queryCount }
    if (job.status === 'COMPLETED') {
      const endpoint = `/api/report/${job.id}`
      const qs = `?token=${encodeURIComponent(job.reportToken)}`
      const report = await fetch(`${origin}/api/report/data/${job.id}${qs}`)
      item.report = report.status
      const invalid = await fetch(`${origin}/api/report/data/${job.id}?token=invalid`)
      item.invalidToken = invalid.status
      const chat = await fetch(`${origin}${endpoint}/chat${qs}`).then(r => r.json())
      item.chatLimit = chat.chatMessageLimit
      item.chatGateCorrect = chat.canChat === config.hasPostAuditChat && chat.chatMessageLimit === (Number.isFinite(config.chatMessageLimit) ? config.chatMessageLimit : null)
      const html = await fetch(`${origin}${endpoint}/download-html${qs}`)
      item.html = html.status
      const pptx = await fetch(`${origin}${endpoint}/download-pptx${qs}`)
      item.pptx = pptx.status
      item.pptxGateCorrect = pptx.status === (config.hasPdf ? 200 : 403)
      if (config.hasPdf && job.pdfUrl) {
        const pdf = await fetch(job.pdfUrl)
        item.pdf = pdf.status
        const bytes = Buffer.from(await pdf.arrayBuffer())
        item.pdfValid = bytes.subarray(0, 5).toString() === '%PDF-'
      }
      if (!config.hasWebsiteFix) {
        const websiteFix = await fetch(`${origin}${endpoint}/website-fix${qs}`, { method: 'POST' })
        item.websiteFixGate = websiteFix.status
      }
      const history = await fetch(`${origin}/api/audit/history?email=another-person%40example.com&token=${encodeURIComponent(job.reportToken)}`)
      item.otherOwnerHistory = history.status
    }
    results.push(item)
    console.log(JSON.stringify(item))
  }
  fs.writeFileSync('/private/tmp/kaligeo-qa-probes.json', JSON.stringify(results, null, 2), { mode: 0o600 })
} finally { await prisma.$disconnect() }
