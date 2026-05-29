import { Metadata } from "next"
import Research2026Form from "./Research2026Form"

export const metadata: Metadata = {
  title: "Состояние GEO в России 2026 — бесплатный PDF-отчёт | KaliGEO",
  description:
    "Скачайте бесплатное исследование: как 500+ российских компаний присутствуют в ChatGPT, Перплексити, YandexGPT и других AI-системах. Данные, метрики, тренды.",
  openGraph: {
    title: "Состояние GEO в России 2026",
    description:
      "Бесплатное исследование: AI-видимость 500+ российских компаний. ChatGPT, YandexGPT, Perplexity, GigaChat.",
    type: "article",
  },
}

const STATS = [
  { value: "500+", label: "компаний проанализировано" },
  { value: "9", label: "AI-платформ охвачено" },
  { value: "40 000+", label: "запросов обработано" },
  { value: "12", label: "ниш в исследовании" },
]

const CONTENTS = [
  "Средний AI Visibility Score по отраслям: кто лидирует, кто в аутсайдерах",
  "Какие платформы чаще упоминают российские бренды — и почему",
  "Топ-5 ошибок, из-за которых AI игнорирует компанию",
  "Как изменилась видимость за Q1–Q2 2026 vs 2025",
  "Практический чеклист: 10 шагов для роста AI-видимости",
  "Сравнение YandexGPT vs ChatGPT: разные алгоритмы, разные победители",
]

export default function Research2026Page() {
  return (
    <div style={{ background: "var(--bone)", minHeight: "100vh", color: "var(--ink)" }}>
      {/* Nav */}
      <header style={{ borderBottom: "1px solid var(--rule)", padding: "16px 0" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <a
            href="/"
            style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink)", textDecoration: "none" }}
          >
            KaliGEO
          </a>
          <a
            href="/pricing"
            style={{ fontSize: "13px", color: "var(--ink-3)", textDecoration: "none", borderBottom: "1px solid var(--rule)" }}
          >
            Заказать аудит →
          </a>
        </div>
      </header>

      <main style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 24px 80px" }}>
        {/* Eyebrow */}
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 16px" }}>
          — Исследование · 2026 · Бесплатно
        </p>

        {/* Title */}
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(28px, 5vw, 48px)",
            fontWeight: 400,
            lineHeight: 1.15,
            margin: "0 0 24px",
            color: "var(--ink)",
          }}
        >
          Состояние GEO <em>в России</em>
          <br />2026
        </h1>

        <p style={{ fontSize: "17px", color: "var(--ink-2)", lineHeight: 1.7, margin: "0 0 40px", maxWidth: "580px" }}>
          Мы проанализировали присутствие 500+ российских компаний в 9 AI-системах:
          ChatGPT, YandexGPT, Perplexity, GigaChat, Claude, Gemini, DeepSeek, Алиса, Grok.
          Это первое публичное исследование AI-видимости на российском рынке.
        </p>

        {/* Stats row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: "1px",
            background: "var(--rule)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            marginBottom: "48px",
          }}
        >
          {STATS.map((s) => (
            <div key={s.value} style={{ background: "var(--bone)", padding: "20px 18px" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "28px", fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
                {s.value}
              </div>
              <div style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "4px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Two columns: contents + form */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "48px",
            alignItems: "start",
          }}
          className="research-grid"
        >
          {/* Contents */}
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 16px" }}>
              — Что внутри
            </p>
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {CONTENTS.map((item, i) => (
                <li key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "10px",
                      fontWeight: 700,
                      color: "var(--accent-ink)",
                      background: "var(--accent)",
                      borderRadius: "3px",
                      padding: "2px 6px",
                      flexShrink: 0,
                      marginTop: "2px",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span style={{ fontSize: "14px", color: "var(--ink-2)", lineHeight: 1.55 }}>{item}</span>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: "32px", padding: "16px", background: "var(--bone-2)", borderRadius: "var(--radius-md)", border: "1px solid var(--rule)" }}>
              <p style={{ fontSize: "13px", color: "var(--ink-3)", margin: 0, lineHeight: 1.6 }}>
                PDF · 28 страниц · Русский язык · Данные за 2026 год
              </p>
            </div>
          </div>

          {/* Form */}
          <div>
            <Research2026Form />
          </div>
        </div>

        {/* Social proof */}
        <div style={{ marginTop: "64px", paddingTop: "40px", borderTop: "1px solid var(--rule)" }}>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 20px" }}>
            — О KaliGEO
          </p>
          <p style={{ fontSize: "14px", color: "var(--ink-3)", lineHeight: 1.7, margin: 0, maxWidth: "520px" }}>
            KaliGEO — первый в СНГ инструмент аудита видимости бренда в AI-поиске.
            Мы провели сотни аудитов для компаний из России и Беларуси.
            Это исследование — агрегат реальных данных от наших клиентов (анонимизированных).
          </p>
          <div style={{ marginTop: "20px", display: "flex", gap: "16px", flexWrap: "wrap" }}>
            <a href="/" style={{ fontSize: "13px", color: "var(--ink)", textDecoration: "none", borderBottom: "1px solid var(--rule)" }}>
              Главная →
            </a>
            <a href="/tools/domain-check" style={{ fontSize: "13px", color: "var(--ink)", textDecoration: "none", borderBottom: "1px solid var(--rule)" }}>
              Бесплатная проверка сайта →
            </a>
            <a href="/pricing" style={{ fontSize: "13px", color: "var(--ink)", textDecoration: "none", borderBottom: "1px solid var(--rule)" }}>
              Заказать полный аудит →
            </a>
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          .research-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}
