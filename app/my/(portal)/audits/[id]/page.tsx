import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"
import { marketFromHost } from "@/lib/market"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AuditRedirectPage({ params }: Props) {
  const clientId = await getClientSession()
  if (!clientId) redirect("/my/login")

  const { id } = await params
  const market = marketFromHost((await headers()).get("host"))

  const job = await prisma.auditJob.findFirst({
    where: { id, clientId, market },
    select: { reportToken: true },
  })

  if (!job) redirect("/my/dashboard")

  redirect(`/report/${id}?token=${job.reportToken}`)
}
