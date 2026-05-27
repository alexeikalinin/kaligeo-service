import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"
import BrandProfileEditor from "@/components/portal/BrandProfileEditor"

export const metadata: Metadata = {
  title: "Бренд-профиль — KaliGEO",
}

export default async function BrandProfilePage({ params }: { params: Promise<{ brandId: string }> }) {
  const clientId = await getClientSession()
  if (!clientId) redirect("/my/login")

  const { brandId } = await params

  if (brandId === "new") {
    return <BrandProfileEditor brand={null} />
  }

  const brand = await prisma.brandProfile.findUnique({ where: { id: brandId } })
  if (!brand || brand.clientId !== clientId) notFound()

  return (
    <BrandProfileEditor
      brand={{
        id: brand.id,
        companyName: brand.companyName,
        websiteUrl: brand.websiteUrl,
        niche: brand.niche,
        alternativeNames: brand.alternativeNames,
        competitors: brand.competitors,
        customPrompts: brand.customPrompts as { id: string; text: string; enabled: boolean }[],
      }}
    />
  )
}
