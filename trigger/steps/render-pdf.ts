import { put } from "@vercel/blob"
import { prisma } from "../../lib/prisma"

export async function renderAndUploadPdf(jobId: string): Promise<string> {
  const job = await prisma.auditJob.findUniqueOrThrow({
    where: { id: jobId },
    include: { report: true, queryResults: true },
  })

  if (!job.report) throw new Error("Report data not found")

  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/report/generate-pdf`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-secret": process.env.INTERNAL_SECRET ?? "",
    },
    body: JSON.stringify({ jobId }),
  })

  if (!response.ok) {
    throw new Error(`PDF generation failed: ${response.status}`)
  }

  const pdfBuffer = await response.arrayBuffer()

  const { url } = await put(`reports/${jobId}.pdf`, pdfBuffer, {
    access: "public",
    contentType: "application/pdf",
  })

  return url
}
