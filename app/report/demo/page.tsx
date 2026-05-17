import { DemoReportClient } from "./DemoReportClient"

export const metadata = {
  title: "Пример AI-аудита — KaliGEO",
  description: "Сравните глубину аудита на каждом тарифе: Basic, Standard, Advanced",
}

export default function DemoReportPage() {
  return <DemoReportClient />
}
