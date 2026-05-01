import type { Metadata } from "next"
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin", "latin-ext"],
  variable: "--font-serif",
  display: "swap",
})

const interTight = Inter_Tight({
  weight: ["400", "600", "800", "900"],
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
})

const jetbrainsMono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "KaliGEO — AI Search Visibility Audit",
  description:
    "Узнайте, как часто ChatGPT, Claude, Gemini и другие AI-системы рекомендуют ваш бренд — и что сделать, чтобы обогнать конкурентов.",
  openGraph: {
    title: "KaliGEO — AI Search Visibility Audit",
    description: "AI-аудит видимости вашего бренда в 8 LLM-платформах",
    siteName: "KaliGEO",
  },
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`h-full ${instrumentSerif.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  )
}
