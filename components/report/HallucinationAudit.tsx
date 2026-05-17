const PLATFORM_LABELS: Record<string, string> = {
  CHATGPT: "ChatGPT", CLAUDE: "Claude", GEMINI: "Gemini",
  PERPLEXITY: "Perplexity", DEEPSEEK: "DeepSeek", YANDEXGPT: "YandexGPT",
  GIGACHAT: "GigaChat", ALISA: "Алиса",
}

export interface HallucinationItem {
  id: string
  platform: string
  claim: string
  correction: string
  sourceHint: string
  severity: "medium" | "high"
}

interface Props {
  items: HallucinationItem[]
}

export function HallucinationAudit({ items }: Props) {
  if (items.length === 0) return null

  return (
    <section className="mt-10">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>
          Что AI говорит о вас неправильно
        </h2>
        <span className="monotag" style={{ color: "#ef4444", borderColor: "#ef4444" }}>
          {items.length} ошибки
        </span>
      </div>
      <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
        Фактические ошибки которые AI воспроизводит о вашем бренде — с указанием вероятного источника.
        Исправление этих данных даёт быстрый прирост доверия AI-систем.
      </p>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl overflow-hidden"
            style={{ border: `1px solid ${item.severity === "high" ? "#fca5a5" : "#fcd34d"}` }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: item.severity === "high" ? "#fef2f2" : "#fffbeb",
                borderBottom: `1px solid ${item.severity === "high" ? "#fca5a5" : "#fcd34d"}`,
              }}
            >
              <span style={{ color: item.severity === "high" ? "#ef4444" : "#f59e0b", fontSize: "18px" }}>
                {item.severity === "high" ? "✕" : "⚠"}
              </span>
              <span className="monotag text-xs" style={{ color: "var(--ink-2)" }}>
                {PLATFORM_LABELS[item.platform] ?? item.platform}
              </span>
              <span
                className="monotag text-xs ml-auto"
                style={{ color: item.severity === "high" ? "#ef4444" : "#f59e0b", borderColor: "currentColor" }}
              >
                {item.severity === "high" ? "критично" : "внимание"}
              </span>
            </div>

            {/* Body */}
            <div className="px-4 py-4 space-y-3" style={{ background: "var(--bone)" }}>
              {/* Wrong claim */}
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  AI говорит
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink)", fontStyle: "italic" }}>
                  «{item.claim}»
                </p>
              </div>

              {/* Correction */}
              <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}>
                <p className="text-xs font-semibold mb-1" style={{ color: "#16a34a", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Правда
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ink)" }}>
                  {item.correction}
                </p>
              </div>

              {/* Source hint */}
              <p className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>
                <span style={{ fontFamily: "var(--font-mono)", textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em" }}>
                  Вероятный источник ошибки:{" "}
                </span>
                {item.sourceHint}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
