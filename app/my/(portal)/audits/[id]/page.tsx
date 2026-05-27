import { redirect } from "next/navigation"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AuditRedirectPage({ params }: Props) {
  const clientId = await getClientSession()
  if (!clientId) redirect("/my/login")

  const { id } = await params

  const job = await prisma.auditJob.findFirst({
    where: { id, clientId },
    select: { reportToken: true },
  })

  if (!job) redirect("/my/dashboard")

  redirect(`/report/${id}?token=${job.reportToken}`)
}
