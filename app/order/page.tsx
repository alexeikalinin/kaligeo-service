import Link from "next/link"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"
import { TIER_CONFIG, type Tier } from "@/lib/gates"
import { marketFromHost } from "@/lib/market"
import OrderForm from "@/components/portal/OrderForm"

export const metadata = { title: "Оформление аудита — KaliGEO", robots: { index: false, follow: false } }

export default async function OrderPage({ searchParams }: {
  searchParams: Promise<{ tier?: string; scanId?: string }>
}) {
  const { tier: requestedTier, scanId } = await searchParams
  const tier: Tier = requestedTier && Object.hasOwn(TIER_CONFIG, requestedTier) ? requestedTier as Tier : "STANDARD"
  const market = marketFromHost((await headers()).get("host"))
  const scan = scanId ? await prisma.freemiumScan.findUnique({
    where: { id: scanId }, select: { companyName: true, websiteUrl: true, niche: true, analysisSnapshot: true },
  }) : null
  const analysis = scan?.analysisSnapshot as { companyName?: string } | null
  const legalEntityName = /^(?:ИП|ООО|ОАО|ЗАО|АО|ЧУП|ОДО)(?:\s|[«"])/i.test(scan?.companyName ?? "")
  const initialCompany = legalEntityName ? analysis?.companyName || scan?.companyName || "" : scan?.companyName ?? ""
  const initialNiche = !scan?.niche || scan.niche === "Общее" ? "" : scan.niche.split(/(?<=[.!?])\s/)[0].slice(0, 200)
  const config = TIER_CONFIG[tier]
  return (
    <main className="max-w-xl mx-auto px-6 py-12">
      <Link href={`/pricing${scanId ? `?scanId=${encodeURIComponent(scanId)}` : ""}`}>← Выбрать другой тариф</Link>
      <h1 className="text-3xl font-bold mt-8 mb-3">Оформление аудита: {config.displayName}</h1>
      <p className="mb-3">{market === "by" ? config.priceLabelByn : config.priceLabel}</p>
      <p className="text-sm mb-6">{config.queryCount} вопросов · {config.platforms.length} платформ. {config.isSubscription ? "Подписка с ежемесячной оплатой. Управление и отмена — в личном кабинете." : "Разовая оплата."}</p>
      <OrderForm tier={tier} market={market} initialCompany={initialCompany}
        initialWebsite={scan?.websiteUrl ?? ""} initialNiche={initialNiche} />
    </main>
  )
}
