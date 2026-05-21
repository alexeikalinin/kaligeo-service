import type { Metadata } from "next"
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google"
import Script from "next/script"
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
      <body className="min-h-full flex flex-col">
        {/* Yandex.Metrika counter */}
        <Script id="ym-init" strategy="afterInteractive">{`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=109349238','ym');
          ym(109349238,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:"dataLayer",referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
        `}</Script>
        <noscript>
          <div>
            <img src="https://mc.yandex.ru/watch/109349238" style={{position:"absolute",left:"-9999px"}} alt="" />
          </div>
        </noscript>
        {/* /Yandex.Metrika counter */}
        {children}
      </body>
    </html>
  )
}
