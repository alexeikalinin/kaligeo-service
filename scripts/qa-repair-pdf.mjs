// Repair only a QA audit's PDF after configuration fixes. No payment or email.
import fs from 'node:fs'
import path from 'node:path'
import dotenv from 'dotenv'
import { createJiti } from 'jiti'
Object.assign(process.env, dotenv.parse(fs.readFileSync('.env')))
const workerEnv = JSON.parse(fs.readFileSync('/private/tmp/kaligeo-trigger-env.json', 'utf8'))
for (const name of ['INTERNAL_SECRET', 'BLOB_READ_WRITE_TOKEN']) {
  const entry = workerEnv.find(e => e.name === name)
  if (!entry?.value) throw new Error(`Missing ${name}`)
  process.env[name] = entry.value
}
process.env.NEXT_PUBLIC_APP_URL = 'https://app.kaligeo.by'
const jiti = createJiti(import.meta.url)
const { prisma } = await jiti.import(path.resolve('lib/prisma.ts'))
const { renderAndUploadPdf } = await jiti.import(path.resolve('trigger/steps/render-pdf.ts'))
try {
  const job = await prisma.auditJob.findUniqueOrThrow({ where: { id: process.argv[2] }, include: { report: true } })
  if (job.source !== 'qa-acceptance' || !job.report || job.paidAt) throw new Error('Only unpaid QA audits with saved analysis may be repaired')
  const pdfUrl = await renderAndUploadPdf(job.id)
  const response = await fetch(pdfUrl)
  if (!response.ok) throw new Error('Uploaded PDF unavailable')
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.subarray(0, 5).toString() !== '%PDF-') throw new Error('Invalid PDF')
  fs.writeFileSync(`/private/tmp/kaligeo-qa-${job.tier}.pdf`, bytes)
  await prisma.auditJob.update({ where: { id: job.id }, data: { pdfUrl, status: 'COMPLETED', completedAt: new Date(), errorMessage: null } })
  console.log(JSON.stringify({ tier: job.tier, pdfBytes: bytes.length, repaired: true, paid: false, emailSent: false }))
} finally { await prisma.$disconnect() }
