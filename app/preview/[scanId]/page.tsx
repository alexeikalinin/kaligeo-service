import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import { EmailCaptureForm } from "@/components/freemium/EmailCaptureForm"

// Show every platform with recorded answers.
const ALL_PLATFORMS = [
  { key: "CHATGPT",   name: "ChatGPT" },
  { key: "GEMINI",    name: "Gemini" },
  { key: "YANDEXGPT", name: "YandexGPT" },
  { key: "CLAUDE",    name: "Claude" },
  { key: "PERPLEXITY",name: "Perplexity" },
  { key: "DEEPSEEK",  name: "DeepSeek" },
  { key: "GIGACHAT",  name: "GigaChat" },
  { key: "ALISA",     name: "Алиса" },
  { key: "GROK",      name: "Grok" },
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
        cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round" transform="rotate(-90 50 50)"
      />
      <text
        x="50" y="55" textAnchor="middle"
        style={{ fontFamily: "var(--font-mono)", fontSize: "22px", fontWeight: "bold", fill: color }}
      >
        {score}
      </text>
    </svg>
  )
}

function MiniBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--rule)" }}>
        <div style={{ width: `${score}%`, background: color, height: "100%", borderRadius: "9999px" }} />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color: "var(--ink-3)" }}>
        {score}
      </span>
    </div>
  )
}

interface QuickCheckPlatformResult {
  score: number
  mentionCount: number
  totalQueries: number
  citationRate: number
}

interface PageProps {
  params: Promise<{ scanId: string }>
}

export default async function PreviewPage({ params }: PageProps) {
  const { scanId } = await params
  const scan = await prisma.freemiumScan.findUnique({ where: { id: scanId } })
  if (!scan) notFound()

  const services = scan.services as string[]
  const platformScores = (scan.platformScores ?? {}) as unknown as Record<string, QuickCheckPlatformResult>
  const hasRealData = scan.quickCheckDone && Object.keys(platformScores).length > 0

  // No measured platform is hidden behind an upgrade.
  const realPlatforms = ALL_PLATFORMS.filter((p) => platformScores[p.key])
  const evidence = scan.queryEvidence as { queries?: string[] } | null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bone)", color: "var(--ink)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "var(--rule)" }}
      >
        <span className="font-mono text-xs font-bold tracking-widest uppercase">KaliGEO</span>
        <Link
          href="#full-audit"
          className="text-xs px-3 py-1.5 rounded font-medium"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Выбрать расширенный аудит →
        </Link>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        {/* Company */}
        <div className="mb-8">
          <p className="t-eyebrow mb-2">
            {hasRealData ? "Результат быстрой проверки" : "Предварительный анализ"}
          </p>
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: "var(--font-serif)" }}>
            {scan.companyName}
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>{scan.websiteUrl}</p>
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
              <span className="text-lg font-normal" style={{ color: "var(--ink-3)" }}> / 100</span>
            </p>
            <p className="text-sm mb-2" style={{ color: "var(--ink-3)" }}>
              {scan.previewScore < 30
                ? "Низкая видимость — AI почти не упоминает ваш бренд"
                : scan.previewScore < 60
                ? "Средняя видимость — есть значительный потенциал роста"
                : "Хорошая видимость — но конкуренты могут опережать вас"}
            </p>
            {hasRealData ? (
              <p className="text-xs px-2 py-1 rounded inline-block" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                ✓ Реальные данные · {Object.keys(platformScores).length} платформы проверены
              </p>
            ) : (
              <p className="text-xs px-2 py-1 rounded inline-block" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                Ответы AI не получены — оценка видимости не подтверждена
              </p>
            )}
          </div>
        </div>

        {/* Platform breakdown */}
        <div className="mb-8">
          <p className="t-eyebrow mb-4">Результаты по платформам</p>

          {/* All measured platforms */}
          {realPlatforms.map((platform) => (
            <div
              key={platform.key}
              className="rounded-lg px-4 py-3 mb-2 flex items-center justify-between"
              style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
            >
              <span className="text-sm font-medium w-28">{platform.name}</span>
              <MiniBar
                score={platformScores[platform.key].score}
                color={
                  platformScores[platform.key].score >= 60 ? "#22c55e"
                  : platformScores[platform.key].score >= 30 ? "#f59e0b"
                  : "#ef4444"
                }
              />
              <span
                className="text-xs ml-2 px-2 py-0.5 rounded"
                style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
              >
                реальные данные
              </span>
            </div>
          ))}

          <p className="text-sm mt-4" style={{ color: "var(--ink-3)" }}>
            Показаны все полученные результаты. Остальные платформы не проверены или не ответили.
            Расширенный аудит — отдельная проверка; число платформ зависит от тарифа.
          </p>
        </div>

        <section className="rounded-xl p-5 mb-8" style={{ border: "1px solid var(--rule)" }}>
          <h2 className="t-eyebrow mb-3">Ниша и вопросы проверки</h2>
          <p className="text-sm mb-3">Определённая ниша: {scan.niche}</p>
          {evidence?.queries?.length ? (
            <ol className="list-decimal pl-5 space-y-2 text-sm">
              {evidence.queries.map((query, i) => <li key={i}>{query}</li>)}
            </ol>
          ) : <p className="text-sm">В этой старой проверке тексты вопросов не сохранялись.</p>}
          <p className="text-xs mt-3" style={{ color: "var(--ink-3)" }}>
            Вопрос о компании проверяет знание бренда, остальные — рекомендации в нише.
            Это малая выборка, а не полная оценка рынка. Если ниша определена неверно, сообщите нам.
          </p>
        </section>

        {/* Email capture */}
        {!scan.emailCaptured && (
          <EmailCaptureForm scanId={scan.id} websiteUrl={scan.websiteUrl} />
        )}

        {/* Detected services */}
        {services.length > 0 && (
          <div
            className="rounded-lg p-4 mb-8"
            style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
          >
            <p className="t-eyebrow mb-2">Обнаруженные услуги</p>
            <div className="flex flex-wrap gap-2">
              {services.slice(0, 6).map((s) => (
                <span key={s} className="monotag">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* What affects score */}
        <div
          className="rounded-xl p-5 mb-6"
          style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
        >
          <p className="t-eyebrow mb-3">Что влияет на ваш score</p>
          <div className="space-y-2 text-sm" style={{ color: "var(--ink-2)" }}>
            <div className="flex items-start gap-2">
              <span style={{ color: "var(--ink)" }}>→</span>
              <span><strong style={{ color: "var(--ink)" }}>Schema.org и llms.txt</strong> — структурированное описание помогает AI понять, чем вы занимаетесь</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: "var(--ink)" }}>→</span>
              <span><strong style={{ color: "var(--ink)" }}>Wikipedia и базы знаний</strong> — помогают проверить сведения о компании</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: "var(--ink)" }}>→</span>
              <span><strong style={{ color: "var(--ink)" }}>Яндекс Бизнес</strong> — главный источник для Алисы и голосовых ответов</span>
            </div>
            <div className="flex items-start gap-2">
              <span style={{ color: "var(--ink)" }}>→</span>
              <span><strong style={{ color: "var(--ink)" }}>Авторитетные источники</strong> — Reddit, YouTube, деловые СМИ в зависимости от платформы</span>
            </div>
          </div>
        </div>

        <section id="full-audit" className="rounded-xl p-6 text-center" style={{ border: "1px solid var(--rule)" }}>
          <h2 className="text-lg font-bold mb-2">Перейти к расширенному аудиту</h2>
          <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
            Быстрая проверка завершена. Расширенный аудит проверяет больше вопросов
            и даёт подробный анализ; состав отчёта зависит от выбранного тарифа.
          </p>
          <Link href={`/pricing?scanId=${encodeURIComponent(scan.id)}`} className="inline-block px-4 py-2 rounded font-medium"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}>
            Посмотреть тарифы расширенного аудита →
          </Link>
        </section>
      </main>
    </div>
  )
}
