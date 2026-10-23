import { headers } from "next/headers"
import { marketFromHost } from "@/lib/market"
import { Suspense } from "react"
import { DemoReportClient } from "./DemoReportClient"

export const metadata = {
  title: "Пример AI-аудита — KaliGEO",
  description: "Посмотрите как выглядит полный AI-аудит видимости бизнеса: Score, Share of Voice, матрица конкурентов, план действий. Выберите тариф и сравните глубину.",
}

export default async function DemoReportPage() {
  const market = marketFromHost((await headers()).get("host"))
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bone)" }}>
        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>Загрузка демо...</p>
      </div>
    }>
      <DemoReportClient market={market} />
    </Suspense>
  )
}
