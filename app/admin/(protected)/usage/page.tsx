import { prisma } from "@/lib/prisma"
import { runRiskAgent } from "@/lib/agents/risk-agent"
import { getActivePlatforms, getInactivePlatforms } from "@/lib/ai-clients"
import { PlatformHealth } from "@/components/admin/PlatformHealth"

// Дневные лимиты на запросы к каждой платформе.
// Настраиваются через env, иначе используются консервативные дефолты.
const DAILY_LIMITS: Record<string, number> = {
  CHATGPT:    Number(process.env.LIMIT_CHATGPT)    || 200,
  CLAUDE:     Number(process.env.LIMIT_CLAUDE)     || 200,
  GEMINI:     Number(process.env.LIMIT_GEMINI)     || 300,
  PERPLEXITY: Number(process.env.LIMIT_PERPLEXITY) || 100,
  DEEPSEEK:   Number(process.env.LIMIT_DEEPSEEK)   || 200,
  YANDEXGPT:  Number(process.env.LIMIT_YANDEXGPT)  || 200,
  GIGACHAT:   Number(process.env.LIMIT_GIGACHAT)   || 100,
  ALISA:      Number(process.env.LIMIT_ALISA)      || 100,
}

const PLATFORM_LABEL: Record<string, string> = {
  CHATGPT:    "ChatGPT",
  CLAUDE:     "Claude",
  GEMINI:     "Gemini",
  PERPLEXITY: "Perplexity",
  DEEPSEEK:   "DeepSeek",
  YANDEXGPT:  "YandexGPT",
  GIGACHAT:   "GigaChat",
  ALISA:      "Алиса",
}

function startOf(unit: "day" | "week" | "month"): Date {
  const d = new Date()
  if (unit === "day") {
    d.setHours(0, 0, 0, 0)
  } else if (unit === "week") {
    const day = d.getDay()
    d.setDate(d.getDate() - ((day + 6) % 7))
    d.setHours(0, 0, 0, 0)
  } else {
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
  }
  return d
}

function pct(used: number, limit: number) {
  return Math.min(Math.round((used / limit) * 100), 100)
}

function statusColor(p: number): string {
  if (p >= 90) return "#ef4444"
  if (p >= 70) return "#f59e0b"
  return "#22c55e"
}

export default async function UsagePage() {
  const activePlatforms = getActivePlatforms()
  const inactivePlatforms = getInactivePlatforms()

  const [riskReport, [todayRows, weekRows, totalRows]] = await Promise.all([
    runRiskAgent(),
    Promise.all([
    prisma.queryResult.groupBy({
      by: ["platform"],
      where: { createdAt: { gte: startOf("day") } },
      _count: { id: true },
    }),
    prisma.queryResult.groupBy({
      by: ["platform"],
      where: { createdAt: { gte: startOf("week") } },
      _count: { id: true },
    }),
    prisma.queryResult.groupBy({
      by: ["platform"],
      _count: { id: true },
    }),
    ]),
  ])

  const toMap = (rows: { platform: string; _count: { id: number } }[]) =>
    Object.fromEntries(rows.map((r) => [r.platform, r._count.id]))

  const today = toMap(todayRows)
  const week = toMap(weekRows)
  const total = toMap(totalRows)

  const platforms = Object.keys(DAILY_LIMITS)

  const totalToday = platforms.reduce((s, p) => s + (today[p] ?? 0), 0)
  const totalWeek = platforms.reduce((s, p) => s + (week[p] ?? 0), 0)
  const totalAll = platforms.reduce((s, p) => s + (total[p] ?? 0), 0)
  const totalLimit = platforms.reduce((s, p) => s + DAILY_LIMITS[p], 0)
  const overallPct = pct(totalToday, totalLimit)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Расход API-лимитов</h1>
        <p className="text-sm text-zinc-500">
          Запросов сегодня: <span className="text-zinc-300 font-mono font-bold">{totalToday}</span>
          {" / "}
          <span className="text-zinc-500">{totalLimit} дневной лимит</span>
          {" · "}
          Неделя: <span className="text-zinc-300 font-mono">{totalWeek}</span>
          {" · "}
          Всего: <span className="text-zinc-300 font-mono">{totalAll}</span>
        </p>
      </div>

      {/* Risk Agent banner */}
      {(() => {
        const RISK_STYLE: Record<string, { bg: string; border: string; icon: string; label: string }> = {
          low:      { bg: "bg-emerald-950/40", border: "border-emerald-800", icon: "✅", label: "Риск: низкий" },
          medium:   { bg: "bg-amber-950/40",   border: "border-amber-700",   icon: "⚠️", label: "Риск: средний" },
          high:     { bg: "bg-orange-950/40",  border: "border-orange-700",  icon: "🔶", label: "Риск: высокий" },
          critical: { bg: "bg-red-950/40",     border: "border-red-700",     icon: "🚨", label: "КРИТИЧНО" },
        }
        const s = RISK_STYLE[riskReport.riskLevel]
        return (
          <div className={`rounded-xl p-4 mb-6 border ${s.bg} ${s.border}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">{s.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-bold text-zinc-200">{s.label}</span>
                  <span className="text-xs text-zinc-500">
                    Очередь: {riskReport.queueDepth} аудитов в работе
                  </span>
                  {!riskReport.canStartAudit && (
                    <span className="text-xs font-semibold text-red-400">
                      🛑 Новые аудиты заблокированы
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400">{riskReport.recommendation}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Suspended platforms */}
      {inactivePlatforms.length > 0 && (
        <div className="rounded-xl p-4 mb-6 border border-zinc-700 bg-zinc-800/50">
          <p className="text-sm font-semibold text-zinc-400 mb-2">
            ⏸ Приостановлены — нет API-ключа ({inactivePlatforms.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {inactivePlatforms.map(({ key, name }) => (
              <span key={key} className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-500">
                {name}
              </span>
            ))}
          </div>
          <p className="text-xs text-zinc-600 mt-2">
            Добавь ключ в .env.local → перезапусти сервер → платформа включится автоматически
          </p>
        </div>
      )}

      {/* Active platforms count */}
      <div className="flex items-center gap-2 mb-4 text-xs text-zinc-500">
        <span className="text-emerald-400 font-semibold">● {activePlatforms.length} активных</span>
        <span>из 8 платформ</span>
        <span className="font-mono">[{activePlatforms.join(", ")}]</span>
      </div>

      {/* Overall bar */}
      <div className="bg-zinc-800 rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-300">Суммарно сегодня</span>
          <span
            className="font-mono text-lg font-bold"
            style={{ color: statusColor(overallPct) }}
          >
            {overallPct}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-zinc-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${overallPct}%`, background: statusColor(overallPct) }}
          />
        </div>
        {overallPct >= 80 && (
          <p className="mt-2 text-xs text-amber-400">
            ⚠ Суммарный дневной лимит почти исчерпан. Новые аудиты могут не завершиться.
          </p>
        )}
      </div>

      {/* Per-platform table */}
      <div className="space-y-3">
        {platforms.map((platform) => {
          const todayCount = today[platform] ?? 0
          const weekCount = week[platform] ?? 0
          const totalCount = total[platform] ?? 0
          const limit = DAILY_LIMITS[platform]
          const p = pct(todayCount, limit)
          const color = statusColor(p)
          const label = PLATFORM_LABEL[platform] ?? platform

          return (
            <div key={platform} className="bg-zinc-800 rounded-xl p-4">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-sm font-semibold text-zinc-200 w-28 shrink-0">
                  {label}
                </span>
                <div className="flex-1 h-2 rounded-full bg-zinc-700 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${p}%`, background: color }}
                  />
                </div>
                <span
                  className="font-mono text-sm font-bold w-12 text-right shrink-0"
                  style={{ color }}
                >
                  {p}%
                </span>
              </div>
              <div className="flex gap-6 text-xs text-zinc-500 pl-0">
                <span>
                  Сегодня:{" "}
                  <span className="font-mono text-zinc-300">
                    {todayCount} / {limit}
                  </span>
                </span>
                <span>
                  Неделя:{" "}
                  <span className="font-mono text-zinc-300">{weekCount}</span>
                </span>
                <span>
                  Всего:{" "}
                  <span className="font-mono text-zinc-300">{totalCount}</span>
                </span>
                {p >= 90 && (
                  <span className="text-red-400 font-medium">
                    🔴 Критический уровень
                  </span>
                )}
                {p >= 70 && p < 90 && (
                  <span className="text-amber-400">⚠ Приближается к лимиту</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 mb-10 text-xs text-zinc-600">
        Лимиты настраиваются через env: LIMIT_CHATGPT, LIMIT_CLAUDE, LIMIT_GEMINI и т.д.
        Счётчики сбрасываются по UTC 00:00. Данные берутся напрямую из БД (таблица QueryResult).
      </p>

      {/* Live API health check */}
      <div className="mb-2">
        <p className="text-xs text-zinc-600 uppercase tracking-widest mb-3">Здоровье API-ключей</p>
        <PlatformHealth />
      </div>
    </div>
  )
}
