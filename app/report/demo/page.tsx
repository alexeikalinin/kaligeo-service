import { Suspense } from "react"
import { DemoReportClient } from "./DemoReportClient"

export const metadata = {
  title: "Пример AI-аудита — KaliGEO",
  description: "Посмотрите как выглядит полный AI-аудит видимости бизнеса: Score, Share of Voice, матрица конкурентов, план действий. Выберите тариф и сравните глубину.",
}

export default function DemoReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bone)" }}>
        <p style={{ color: "var(--ink-3)", fontSize: 14 }}>Загрузка демо...</p>
      </div>
    }>
      <DemoReportClient />
    </Suspense>
  )
}
