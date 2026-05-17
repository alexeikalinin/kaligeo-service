import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { EmailCaptureForm } from "@/components/freemium/EmailCaptureForm"

const PLATFORMS = [
  { name: "ChatGPT", score: null },
  { name: "Claude", score: null },
  { name: "Gemini", score: null },
  { name: "Perplexity", score: null },
  { name: "DeepSeek", score: null },
  { name: "YandexGPT", score: null },
  { name: "GigaChat", score: null },
]

function ScoreRing({ score }: { score: number }) {
  const r = 40
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ

  const color = score >= 60 ? "#22c55e" : score >= 30 ? "#f59e0b" : "#ef4444"

  return (
    <svg width="100" height="100" viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--rule)" strokeWidth="8" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="55"
        textAnchor="middle"
        style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: "bold", fill: color }}
      >
        {score}
      </text>
    </svg>
  )
}

interface PageProps {
  params: Promise<{ scanId: string }>
}

export default async function PreviewPage({ params }: PageProps) {
  const { scanId } = await params
  const scan = await prisma.freemiumScan.findUnique({ where: { id: scanId } })

  if (!scan) notFound()

  const services = scan.services as string[]

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bone)", color: "var(--ink)" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--rule)" }}
      >
        <span className="font-mono text-xs font-bold tracking-widest uppercase">KaliGEO</span>
        <Link
          href="/chat"
          className="text-xs px-3 py-1.5 rounded font-medium"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Запустить полный аудит →
        </Link>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        {/* Company */}
        <div className="mb-8">
          <p className="t-eyebrow mb-2">Предварительный анализ</p>
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-serif)" }}>
            {scan.companyName}
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>
            {scan.websiteUrl}
          </p>
        </div>

        {/* Score card */}
        <div
          className="rounded-xl p-6 mb-8 flex items-center gap-8"
          style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
        >
          <ScoreRing score={scan.previewScore} />
          <div>
            <p className="t-eyebrow mb-1">Индекс AI-видимости</p>
            <p className="text-4xl font-bold mb-1" style={{ fontFamily: "var(--font-mono)" }}>
              {scan.previewScore}
              <span className="text-lg font-normal" style={{ color: "var(--ink-3)" }}>
                {" "}/ 100
              </span>
            </p>
            <p className="text-sm mb-2" style={{ color: "var(--ink-3)" }}>
              {scan.previewScore < 30
                ? "Низкая видимость — AI почти не упоминает ваш бренд"
                : scan.previewScore < 60
                ? "Средняя видимость — есть значительный потенциал роста"
                : "Хорошая видимость — но конкуренты могут опережать вас"}
            </p>
            <p className="text-xs px-2 py-1 rounded inline-block" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              Средний конкурент в вашей нише — 61/100
            </p>
          </div>
        </div>

        {/* Platform breakdown — blurred */}
        <div className="mb-8">
          <p className="t-eyebrow mb-4">Результаты по платформам</p>
          <div className="space-y-2 relative">
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl"
              style={{ backdropFilter: "blur(8px)", background: "rgba(250,250,247,0.7)" }}
            >
              <p className="font-semibold text-sm mb-1" style={{ color: "var(--ink)" }}>
                Данные по 7 платформам доступны в полном отчёте
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
                ChatGPT · Claude · Gemini · Perplexity · DeepSeek · YandexGPT · GigaChat
              </p>
              <Link
                href={`/chat?url=${encodeURIComponent(scan.websiteUrl)}&source=preview`}
                className="px-4 py-2 rounded font-medium text-sm"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Получить полный отчёт
              </Link>
            </div>
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-lg px-4 py-3"
                style={{ border: "1px solid var(--rule)" }}
              >
                <span className="text-sm font-medium">{p.name}</span>
                <div
                  className="h-2 w-24 rounded-full"
                  style={{ background: "var(--rule)" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Email capture */}
        {!scan.emailCaptured && (
          <EmailCaptureForm scanId={scan.id} websiteUrl={scan.websiteUrl} />
        )}

        {/* Niche detected */}
        {services.length > 0 && (
          <div
            className="rounded-lg p-4 mb-8"
            style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
          >
            <p className="t-eyebrow mb-2">Обнаруженные услуги</p>
            <div className="flex flex-wrap gap-2">
              {services.slice(0, 6).map((s) => (
                <span key={s} className="monotag">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div
          className="rounded-xl p-6 text-center"
          style={{ border: "1px solid var(--rule)" }}
        >
          <p
            className="text-lg font-bold mb-2"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Узнайте, как обогнать конкурентов в AI-поиске
          </p>
          <p className="text-sm mb-4" style={{ color: "var(--ink-3)" }}>
            Полный аудит: 7 платформ, анализ конкурентов, план действий
          </p>
          <Link
            href={`/chat?url=${encodeURIComponent(scan.websiteUrl)}&source=preview`}
            className="inline-block px-6 py-2.5 rounded font-semibold text-sm transition-opacity hover:opacity-80"
            style={{ background: "var(--ink)", color: "var(--bone)" }}
          >
            Запустить аудит →
          </Link>
        </div>
      </main>
    </div>
  )
}
