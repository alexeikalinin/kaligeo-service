import Link from "next/link"
import { FreemiumForm } from "@/components/landing/FreemiumForm"

const PLATFORMS = [
  "ChatGPT", "Claude", "Gemini", "Perplexity",
  "DeepSeek", "YandexGPT", "GigaChat", "Alisa", "Grok",
]

const STEPS = [
  {
    n: "01",
    title: "Введите URL сайта",
    desc: "Мы проанализируем ваш сайт и определим нишу, услуги и ключевые слова автоматически.",
  },
  {
    n: "02",
    title: "Получите предварительный score",
    desc: "Бесплатно — за 30 секунд. Узнайте, насколько AI-платформы знают ваш бренд прямо сейчас.",
  },
  {
    n: "03",
    title: "Запустите полный аудит",
    desc: "50+ запросов к 9 платформам. PDF-отчёт, матрица конкурентов и план действий на 90 дней.",
  },
]

const TIERS = [
  {
    name: "Basic",
    price: "$50",
    queries: "15 запросов",
    platforms: "3 платформы",
    features: ["ChatGPT, Gemini, YandexGPT", "Базовый отчёт", "Индекс видимости"],
    accent: false,
  },
  {
    name: "Standard",
    price: "$150",
    queries: "30 запросов",
    platforms: "6 платформ",
    features: ["+ Claude, Perplexity, DeepSeek", "PDF-отчёт", "Матрица конкурентов", "План на 90 дней", "Чат с отчётом"],
    accent: true,
  },
  {
    name: "Advanced",
    price: "$300",
    queries: "50 запросов",
    platforms: "9 платформ",
    features: ["Все платформы", "AI-агенты: глубокий анализ", "Исправление страницы сайта", "Безлимитный чат", "Приоритет 24ч"],
    accent: false,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--ink)", color: "var(--bone)" }}>
      {/* Nav */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--ink-border)" }}
      >
        <span className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: "var(--bone)" }}>
          KaliGEO
        </span>
        <div className="flex items-center gap-4">
          <Link
            href="/chat"
            className="text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: "var(--ink-3)" }}
          >
            Чат
          </Link>
          <Link
            href="/chat"
            className="text-xs px-3 py-1.5 rounded font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Начать аудит →
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
        <p className="t-eyebrow mb-6" style={{ color: "var(--ink-3)" }}>
          AI-аудит видимости бренда
        </p>
        <h1
          className="text-5xl md:text-6xl font-bold mb-6 leading-tight"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Знает ли ChatGPT{" "}
          <span style={{ color: "var(--accent)" }}>ваш бренд?</span>
        </h1>
        <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: "var(--ink-3)" }}>
          Введите URL — за 30 секунд узнаете, насколько ChatGPT, Claude, Gemini и другие AI рекомендуют вас вместо конкурентов.
        </p>

        <div className="flex justify-center mb-4">
          <FreemiumForm />
        </div>

        <p className="text-xs" style={{ color: "var(--ink-3)" }}>
          Бесплатно · Без регистрации · Результат за 30 секунд
        </p>
      </section>

      {/* Stats strip */}
      <div
        className="border-y py-6"
        style={{ borderColor: "var(--ink-border)" }}
      >
        <div className="max-w-3xl mx-auto px-6 flex flex-wrap justify-center gap-8 text-center">
          {[
            { v: "9", l: "AI-платформ" },
            { v: "50+", l: "запросов на аудит" },
            { v: "24ч", l: "срок доставки" },
            { v: "PDF", l: "отчёт с планом" },
          ].map(({ v, l }) => (
            <div key={l}>
              <p className="text-2xl font-bold mb-0.5" style={{ fontFamily: "var(--font-mono)", color: "var(--accent)" }}>{v}</p>
              <p className="text-xs" style={{ color: "var(--ink-3)" }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-6 py-20">
        <p className="t-eyebrow mb-10 text-center">Как это работает</p>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <div key={s.n}>
              <p
                className="text-4xl font-bold mb-3"
                style={{ fontFamily: "var(--font-mono)", color: "var(--ink-2)" }}
              >
                {s.n}
              </p>
              <p className="font-semibold mb-2 text-sm">{s.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Platforms */}
      <section
        className="border-t py-16"
        style={{ borderColor: "var(--ink-border)" }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <p className="t-eyebrow mb-8 text-center">Измеряем видимость на 9 платформах</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PLATFORMS.map((p) => (
              <span key={p} className="monotag" style={{ borderColor: "var(--ink-border)", color: "var(--ink-3)" }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        className="border-t py-20"
        style={{ borderColor: "var(--ink-border)" }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <p className="t-eyebrow mb-10 text-center">Тарифы</p>
          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className="rounded-xl p-6 flex flex-col"
                style={{
                  border: t.accent ? `2px solid var(--accent)` : "1px solid var(--ink-border)",
                  background: t.accent ? "rgba(200,242,74,0.04)" : "transparent",
                }}
              >
                {t.accent && (
                  <span className="monotag-solid self-start mb-4 text-xs">Популярный</span>
                )}
                <p className="font-semibold mb-1">{t.name}</p>
                <p
                  className="text-3xl font-bold mb-1"
                  style={{ fontFamily: "var(--font-mono)", color: t.accent ? "var(--accent)" : "var(--bone)" }}
                >
                  {t.price}
                </p>
                <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
                  {t.queries} · {t.platforms}
                </p>
                <ul className="space-y-1.5 mb-6 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="text-xs flex gap-2" style={{ color: "var(--ink-3)" }}>
                      <span style={{ color: "var(--accent)" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/chat"
                  className="text-center text-xs py-2.5 px-4 rounded font-semibold transition-opacity hover:opacity-80"
                  style={
                    t.accent
                      ? { background: "var(--accent)", color: "var(--accent-ink)" }
                      : { border: "1px solid var(--ink-border)", color: "var(--bone)" }
                  }
                >
                  Выбрать {t.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        className="border-t py-20 text-center"
        style={{ borderColor: "var(--ink-border)" }}
      >
        <div className="max-w-xl mx-auto px-6">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Проверьте свой бренд бесплатно
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--ink-3)" }}>
            Узнайте свой AI-индекс видимости прямо сейчас — без регистрации и оплаты
          </p>
          <div className="flex justify-center">
            <FreemiumForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-6 flex items-center justify-between text-xs"
        style={{ borderColor: "var(--ink-border)", color: "var(--ink-3)" }}
      >
        <span className="font-mono font-bold tracking-widest uppercase" style={{ color: "var(--bone)" }}>KaliGEO</span>
        <span>© 2025</span>
      </footer>
    </div>
  )
}
