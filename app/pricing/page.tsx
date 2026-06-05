import { Metadata } from "next"
import Link from "next/link"
import { TIER_CONFIG } from "@/lib/gates"

export const metadata: Metadata = {
  title: "Тарифы — KaliGEO",
  description: "Узнайте, насколько ваш бренд виден AI-ассистентам. Разовый аудит или постоянный мониторинг.",
}

const ONE_TIME_TIERS = ["BASIC", "STANDARD", "ADVANCED"] as const
const SUBSCRIPTION_TIERS = ["MONITOR_START", "MONITOR_PRO", "MONITOR_AGENT"] as const

// Features shown on pricing cards (in order)
const ONE_TIME_FEATURES: { key: keyof typeof TIER_CONFIG.BASIC; label: string }[] = [
  { key: "queryCount",        label: "Запросов к AI" },
  { key: "hasPdf",            label: "PDF-отчёт" },
  { key: "hasActionPlan",     label: "План роста 30/60/90" },
  { key: "hasCompetitorMatrix", label: "Матрица конкурентов" },
  { key: "hasRagSources",     label: "Источники (RAG)" },
  { key: "hasPostAuditChat",  label: "Чат с AI по отчёту" },
  { key: "hasAnalysisAgent",  label: "AI-агент анализа" },
  { key: "hasWebsiteFix",     label: "Исправление сайта AI" },
]

const SUB_FEATURES: { key: keyof typeof TIER_CONFIG.MONITOR_START; label: string }[] = [
  { key: "queryCount",           label: "Запросов к AI" },
  { key: "hasComparison",        label: "Сравнение с прошлым" },
  { key: "hasMonitoringAlerts",  label: "Email-алерты при падении" },
  { key: "hasPdf",               label: "PDF-отчёт" },
  { key: "hasActionPlan",        label: "План роста 30/60/90" },
  { key: "hasAnalysisAgent",     label: "AI-агент анализа" },
]

function featureValue(val: unknown): string {
  if (typeof val === "boolean") return val ? "✓" : "—"
  if (typeof val === "number") return String(val)
  if (val === Infinity) return "∞"
  return String(val)
}

function isTicked(val: unknown): boolean {
  if (typeof val === "boolean") return val
  if (typeof val === "number") return true
  return false
}

export default function PricingPage() {
  return (
    <div style={{ background: "var(--bone)", minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--rule)", background: "var(--bone)" }}>
        <div
          className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between"
        >
          <Link
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
          </Link>
          <Link
            href="/my/login"
            style={{
              fontSize: "13px",
              color: "var(--ink-3)",
              textDecoration: "none",
            }}
          >
            Личный кабинет →
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <p className="t-eyebrow mb-3">Тарифы</p>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(32px, 5vw, 52px)",
              fontWeight: 400,
              color: "var(--ink)",
              margin: "0 0 16px",
              lineHeight: 1.15,
            }}
          >
            Платите один раз.<br />Отчёт ваш навсегда.
          </h1>
          <p style={{ fontSize: "16px", color: "var(--ink-3)", maxWidth: "480px", margin: "0 auto" }}>
            У конкурентов — 29 990 ₽/мес за подписку. У нас — разовый аудит с полным отчётом.
          </p>
        </div>

        {/* ── РАЗОВЫЕ АУДИТЫ ── */}
        <div className="mb-4">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              marginBottom: "16px",
            }}
          >
            Разовый аудит
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ONE_TIME_TIERS.map((tier, idx) => {
              const cfg = TIER_CONFIG[tier]
              const isPopular = tier === "STANDARD"
              const isPremium = tier === "ADVANCED"
              return (
                <div
                  key={tier}
                  style={{
                    border: `1px solid ${isPopular ? "var(--accent)" : "var(--rule)"}`,
                    borderRadius: "var(--radius-lg)",
                    background: isPremium ? "var(--ink)" : "var(--bone)",
                    padding: "28px 24px",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {isPopular && (
                    <span
                      style={{
                        position: "absolute",
                        top: "-1px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "var(--accent)",
                        color: "var(--accent-ink)",
                        fontSize: "10px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        padding: "3px 12px",
                        borderRadius: "0 0 6px 6px",
                      }}
                    >
                      ПОПУЛЯРНЫЙ
                    </span>
                  )}

                  <div style={{ marginBottom: "20px" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: isPremium ? "var(--bone-2)" : "var(--ink-3)",
                        marginBottom: "6px",
                      }}
                    >
                      {cfg.displayName}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "32px",
                        fontWeight: 700,
                        color: isPremium ? "var(--bone)" : "var(--ink)",
                        margin: "0 0 4px",
                        lineHeight: 1,
                      }}
                    >
                      {cfg.priceLabel}
                    </p>
                    <p style={{ fontSize: "12px", color: isPremium ? "var(--bone-2)" : "var(--ink-3)" }}>
                      единовременно
                    </p>
                    {isPremium && (
                      <p
                        style={{
                          fontSize: "11px",
                          color: "var(--accent)",
                          marginTop: "4px",
                          fontFamily: "var(--font-mono)",
                          textDecoration: "line-through",
                          textDecorationColor: "rgba(200,242,74,0.5)",
                        }}
                      >
                        29 990 ₽/мес у конкурентов
                      </p>
                    )}
                  </div>

                  <ul style={{ flex: 1, listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {ONE_TIME_FEATURES.map(({ key, label }) => {
                      const val = cfg[key as keyof typeof cfg]
                      const active = isTicked(val)
                      return (
                        <li
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            fontSize: "13px",
                            color: active
                              ? (isPremium ? "var(--bone)" : "var(--ink-2)")
                              : (isPremium ? "rgba(245,245,240,0.3)" : "var(--ink-3)"),
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: active ? "var(--accent)" : "transparent",
                              width: "14px",
                              flexShrink: 0,
                            }}
                          >
                            {active ? "✓" : "—"}
                          </span>
                          {key === "queryCount" ? `${cfg.queryCount} запросов к AI` : label}
                        </li>
                      )
                    })}
                  </ul>

                  <Link
                    href={`https://kaligeo.ru/#cta`}
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "11px 0",
                      borderRadius: "var(--radius-md)",
                      background: isPopular ? "var(--accent)" : isPremium ? "var(--bone-2)" : "var(--bone-2)",
                      color: isPopular ? "var(--accent-ink)" : isPremium ? "var(--ink)" : "var(--ink-2)",
                      border: `1px solid ${isPopular ? "var(--accent)" : isPremium ? "transparent" : "var(--rule)"}`,
                      fontSize: "13px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Начать →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* Comparison note */}
        <div
          className="rounded-lg px-5 py-4 mb-16"
          style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
        >
          <div className="flex items-start gap-3">
            <span style={{ fontSize: "20px", flexShrink: 0 }}>💡</span>
            <p style={{ fontSize: "13px", color: "var(--ink-2)", lineHeight: 1.6, margin: 0 }}>
              <strong style={{ color: "var(--ink)" }}>VisioBrand Про стоит 29 990 ₽/мес</strong> — это 359 880 ₽ в год за подписку.
              Наш Агентский аудит — разово 27 900 ₽, отчёт остаётся у вас навсегда.
              Нужен мониторинг? Есть подписочные тарифы ниже.
            </p>
          </div>
        </div>

        {/* ── МОНИТОРИНГ (ПОДПИСКА) ── */}
        <div>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--ink-3)",
              marginBottom: "16px",
            }}
          >
            Мониторинг (подписка)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SUBSCRIPTION_TIERS.map((tier) => {
              const cfg = TIER_CONFIG[tier]
              return (
                <div
                  key={tier}
                  style={{
                    border: "1px solid var(--rule)",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--bone)",
                    padding: "28px 24px",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div style={{ marginBottom: "20px" }}>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--ink-3)",
                        marginBottom: "6px",
                      }}
                    >
                      {cfg.displayName}
                    </p>
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "28px",
                        fontWeight: 700,
                        color: "var(--ink)",
                        margin: "0 0 4px",
                        lineHeight: 1,
                      }}
                    >
                      {cfg.priceLabel}
                    </p>
                    <p style={{ fontSize: "12px", color: "var(--ink-3)" }}>
                      автопродление · минимум 3 месяца
                    </p>
                  </div>

                  <ul style={{ flex: 1, listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    {SUB_FEATURES.map(({ key, label }) => {
                      const val = cfg[key as keyof typeof cfg]
                      const active = isTicked(val)
                      return (
                        <li
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            fontSize: "13px",
                            color: active ? "var(--ink-2)" : "var(--ink-3)",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: active ? "var(--accent)" : "transparent",
                              width: "14px",
                              flexShrink: 0,
                            }}
                          >
                            {active ? "✓" : "—"}
                          </span>
                          {key === "queryCount" ? `${cfg.queryCount} запросов/аудит` : label}
                        </li>
                      )
                    })}
                  </ul>

                  <Link
                    href="/my/login"
                    style={{
                      display: "block",
                      textAlign: "center",
                      padding: "11px 0",
                      borderRadius: "var(--radius-md)",
                      background: "var(--bone-2)",
                      color: "var(--ink-2)",
                      border: "1px solid var(--rule)",
                      fontSize: "13px",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    Подключить →
                  </Link>
                </div>
              )
            })}
          </div>
        </div>

        {/* FAQ / bottom CTA */}
        <div className="mt-20 text-center">
          <p style={{ fontSize: "14px", color: "var(--ink-3)", marginBottom: "16px" }}>
            Не знаете с чего начать? Проверьте домен бесплатно — за 10 секунд.
          </p>
          <Link
            href="/tools/domain-check"
            style={{
              display: "inline-block",
              padding: "12px 28px",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: "var(--radius-md)",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Бесплатная проверка домена →
          </Link>
        </div>
      </div>
    </div>
  )
}
