const LOCKED_COPY: Record<string, { title: string; description: string }> = {
  competitors: {
    title: "Матрица конкурентов",
    description: "Кто называется вместо вас в ChatGPT, Claude и других платформах — с числом упоминаний и разрывом по платформам.",
  },
  plan: {
    title: "30/60/90-дневный план роста",
    description: "Приоритизированные шаги с конкретными действиями, инструментами и ожидаемым приростом видимости.",
  },
  queries: {
    title: "Все запросы с ответами AI",
    description: "Полные тексты 50 реальных запросов и ответов каждой платформы — с источниками которые AI цитирует.",
  },
  progress: {
    title: "Сравнительный анализ прогресса",
    description: "Динамика видимости бренда с момента предыдущего аудита — рост score, исправленные проблемы, изменения по платформам и конкурентам.",
  },
}

const TIER_PRICE: Record<string, string> = {
  STANDARD: "Standard — $150",
  ADVANCED: "Advanced — $300",
}

interface Props {
  requiredTier: "STANDARD" | "ADVANCED"
  tabKey: string
}

export function LockedTabPlaceholder({ requiredTier, tabKey }: Props) {
  const copy = LOCKED_COPY[tabKey] ?? { title: "Раздел", description: "Доступен на более высоком тарифе." }

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ minHeight: "320px" }}>
      {/* Blurred ghost content */}
      <div
        aria-hidden
        style={{ filter: "blur(5px)", opacity: 0.35, pointerEvents: "none", userSelect: "none" }}
      >
        <div className="space-y-3 p-2">
          {[80, 60, 90, 50, 70].map((w, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="rounded h-8 w-8 shrink-0" style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }} />
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded" style={{ background: "var(--rule)", width: `${w}%` }} />
                <div className="h-2 rounded" style={{ background: "var(--rule)", width: `${w * 0.6}%` }} />
              </div>
              <div className="h-6 w-16 rounded" style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center text-center gap-5 px-6"
        style={{ background: "rgba(245,242,236,0.90)", backdropFilter: "blur(2px)" }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
          style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
        >
          🔒
        </div>

        <div>
          <p className="text-base font-bold mb-1" style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}>
            {copy.title}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-2)", maxWidth: "360px" }}>
            {copy.description}
          </p>
        </div>

        <div
          className="rounded-lg px-5 py-3 text-sm"
          style={{ background: "var(--bone-2)", border: "1px solid var(--rule)", color: "var(--ink-3)" }}
        >
          Доступно в тарифе{" "}
          <span className="font-semibold" style={{ color: "var(--ink)" }}>
            {TIER_PRICE[requiredTier]}
          </span>
        </div>

        <a
          href="/#pricing"
          className="px-6 py-2.5 rounded text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--ink)", color: "var(--bone)" }}
        >
          Выбрать тариф →
        </a>
      </div>
    </div>
  )
}
