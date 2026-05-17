"use client"

import { useState } from "react"
import Link from "next/link"
import { use } from "react"
import type { WebsiteFixResult, WebsiteFix } from "@/lib/agents/website-fix-agent"

const FIX_TYPE_LABEL: Record<string, string> = {
  "structured-data": "JSON-LD",
  meta: "Meta-теги",
  faq: "FAQ",
  content: "Контент",
  about: "О компании",
  home: "Главная",
}

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="monotag transition-colors"
      style={
        copied
          ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--accent-ink)" }
          : {}
      }
    >
      {copied ? "Скопировано ✓" : "Копировать"}
    </button>
  )
}

function FixCard({ fix }: { fix: WebsiteFix }) {
  const [expanded, setExpanded] = useState(false)
  const typeLabel = FIX_TYPE_LABEL[fix.type] ?? fix.type

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--rule)" }}
    >
      <div
        className="flex items-start gap-4 px-5 py-4 cursor-pointer hover:bg-[var(--bone-2)] transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <span
          className="monotag shrink-0 mt-0.5"
          style={{ background: "var(--bone-2)" }}
        >
          {typeLabel}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{fix.title}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>
            {fix.page}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--ink-2)" }}>
            {fix.description}
          </p>
        </div>
        <span
          className="text-lg shrink-0 transition-transform"
          style={{
            color: "var(--ink-3)",
            transform: expanded ? "rotate(180deg)" : "rotate(0)",
          }}
        >
          ↓
        </span>
      </div>

      {expanded && (
        <div style={{ borderTop: "1px solid var(--rule)" }}>
          <div
            className="flex items-center justify-between px-5 py-2"
            style={{ background: "var(--bone-2)" }}
          >
            <span className="text-xs" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
              Код для вставки
            </span>
            <CopyButton code={fix.code} />
          </div>
          <pre
            className="px-5 py-4 text-xs overflow-x-auto leading-relaxed"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--ink-2)",
              background: "var(--bone)",
              maxHeight: "400px",
              overflowY: "auto",
            }}
          >
            {fix.code}
          </pre>
        </div>
      )}
    </div>
  )
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default function WebsiteFixPage({ params }: PageProps) {
  const { id } = use(params)
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [result, setResult] = useState<WebsiteFixResult | null>(null)
  const [errorMsg, setErrorMsg] = useState("")

  async function generate() {
    setState("loading")
    setErrorMsg("")
    try {
      const res = await fetch(`/api/report/${id}/website-fix`, { method: "POST" })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data = (await res.json()) as WebsiteFixResult
      setResult(data)
      setState("done")
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Неизвестная ошибка")
      setState("error")
    }
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bone)", color: "var(--ink)" }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-4 px-6 py-4 border-b"
        style={{ borderColor: "var(--rule)" }}
      >
        <Link
          href={`/report/${id}`}
          className="text-sm transition-colors hover:opacity-70"
          style={{ color: "var(--ink-3)" }}
        >
          ← Отчёт
        </Link>
        <span style={{ color: "var(--rule)" }}>|</span>
        <span
          className="font-mono text-xs font-bold tracking-widest uppercase"
          style={{ color: "var(--ink)" }}
        >
          Website Fix
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <p className="t-eyebrow mb-1">Advanced</p>
          <h1
            className="text-3xl font-bold mb-3"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Исправление сайта
          </h1>
          <p style={{ color: "var(--ink-2)" }}>
            AI-агент проанализирует данные аудита и сгенерирует готовый HTML-код для
            улучшения видимости вашего бренда в ChatGPT, Claude, Gemini и Perplexity.
          </p>
        </div>

        {state === "idle" && (
          <div
            className="rounded-lg p-8 text-center"
            style={{ border: "1px dashed var(--rule)" }}
          >
            <p className="text-sm mb-6" style={{ color: "var(--ink-2)" }}>
              Агент создаст JSON-LD разметку, оптимизированные мета-теги, FAQ-секцию и
              рекомендации по контенту — всё готово к внедрению.
            </p>
            <button
              onClick={generate}
              className="px-6 py-2.5 rounded font-medium text-sm transition-colors"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              Запустить Website Fix Agent →
            </button>
          </div>
        )}

        {state === "loading" && (
          <div
            className="rounded-lg p-8 text-center"
            style={{ border: "1px solid var(--rule)" }}
          >
            <div
              className="inline-block w-6 h-6 rounded-full border-2 border-transparent mb-4"
              style={{
                borderTopColor: "var(--ink)",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p className="text-sm" style={{ color: "var(--ink-2)" }}>
              Агент анализирует данные аудита и генерирует рекомендации...
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--ink-3)" }}>
              Обычно занимает 30–60 секунд
            </p>
          </div>
        )}

        {state === "error" && (
          <div
            className="rounded-lg p-6"
            style={{ border: "1px solid #ef4444", background: "#fef2f2" }}
          >
            <p className="text-sm font-medium text-red-700 mb-1">Ошибка</p>
            <p className="text-sm text-red-600">{errorMsg}</p>
            <button
              onClick={generate}
              className="mt-4 text-sm font-medium transition-colors hover:opacity-70"
              style={{ color: "var(--ink)" }}
            >
              Попробовать снова →
            </button>
          </div>
        )}

        {state === "done" && result && (
          <div className="space-y-6">
            {/* Summary card */}
            <div
              className="rounded-lg p-5"
              style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <p className="t-eyebrow mb-1">Что меняем</p>
                  <p className="text-sm leading-relaxed">{result.summary}</p>
                </div>
                <div
                  className="shrink-0 rounded px-3 py-1.5 text-center"
                  style={{ background: "var(--accent)", minWidth: "110px" }}
                >
                  <p className="text-xs font-mono font-bold" style={{ color: "var(--accent-ink)" }}>
                    Ожидаемый эффект
                  </p>
                  <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--accent-ink)" }}>
                    {result.estimatedImpact}
                  </p>
                </div>
              </div>
            </div>

            {/* Fixes */}
            <div>
              <p className="t-eyebrow mb-3">
                Рекомендации ({result.fixes.length})
              </p>
              <div className="space-y-3">
                {result.fixes.map((fix, i) => (
                  <FixCard key={i} fix={fix} />
                ))}
              </div>
            </div>

            <p className="text-xs text-center" style={{ color: "var(--ink-3)" }}>
              Сгенерировано {new Date(result.generatedAt).toLocaleString("ru-RU")}
            </p>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
