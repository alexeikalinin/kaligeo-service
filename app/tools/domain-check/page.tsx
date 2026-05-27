import { Metadata } from "next"
import DomainCheckWidget from "@/components/portal/DomainCheckWidget"

export const metadata: Metadata = {
  title: "Проверка AI-готовности сайта — KaliGEO",
  description: "Бесплатная проверка: насколько ваш сайт виден AI-ассистентам. robots.txt, llms.txt, Schema.org, SSR — за 10 секунд.",
}

export default function DomainCheckPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bone)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: "1px solid var(--rule)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href="/"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: "13px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink)",
            textDecoration: "none",
          }}
        >
          KaliGEO
        </a>
        <a
          href="/my/login"
          style={{
            fontSize: "13px",
            color: "var(--ink-3)",
            textDecoration: "none",
            padding: "6px 12px",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Личный кабинет →
        </a>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "64px 24px",
          maxWidth: "640px",
          margin: "0 auto",
          width: "100%",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              margin: "0 0 12px",
            }}
          >
            Бесплатный инструмент
          </p>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(28px, 5vw, 40px)",
              fontWeight: 400,
              margin: "0 0 12px",
              lineHeight: 1.15,
            }}
          >
            AI-готовность сайта
          </h1>
          <p style={{ fontSize: "16px", color: "var(--ink-3)", margin: 0, lineHeight: 1.6 }}>
            Проверяем 4 сигнала, которые AI-ассистенты используют при индексации.
            Результат за 10 секунд — без регистрации.
          </p>
        </div>

        <DomainCheckWidget />
      </main>
    </div>
  )
}
