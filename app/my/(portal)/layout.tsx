import { redirect } from "next/navigation"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import PortalTopNav from "@/components/portal/PortalTopNav"

export default async function MyLayout({ children }: { children: React.ReactNode }) {
  const clientId = await getClientSession()
  if (!clientId) {
    redirect("/my/login")
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, email: true, companyName: true },
  })

  if (!client) {
    redirect("/my/login")
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bone)", color: "var(--ink)" }}>
      <PortalTopNav client={client} />
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  )
}
