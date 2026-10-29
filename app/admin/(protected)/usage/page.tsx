import { prisma } from "@/lib/prisma"
import { runRiskAgent } from "@/lib/agents/risk-agent"
import { getActivePlatforms, getInactivePlatforms } from "@/lib/ai-clients"
import { PlatformHealth } from "@/components/admin/PlatformHealth"

const PLATFORM_LABEL: Record<string, string> = {
  CHATGPT:    "ChatGPT",
  CLAUDE:     "Claude",
  GEMINI:     "Gemini",
  PERPLEXITY: "Perplexity",
  DEEPSEEK:   "DeepSeek",
  YANDEXGPT:  "YandexGPT",
  GIGACHAT:   "GigaChat",
  ALISA:      "Алиса",
  GROK:       "Grok",
}

function startOf(unit: "day" | "week" | "month"): Date {
  const d = new Date()
  if (unit === "day") {
    d.setUTCHours(0, 0, 0, 0)
  } else if (unit === "week") {
    const day = d.getUTCDay()
    d.setUTCDate(d.getUTCDate() - ((day + 6) % 7))
    d.setUTCHours(0, 0, 0, 0)
  } else {
    d.setUTCDate(1)
    d.setUTCHours(0, 0, 0, 0)
  }
  return d
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

  const recentUsage=await prisma.auditJob.findMany({where:{},orderBy:{updatedAt:"desc"},take:30,select:{id:true,companyName:true,aiUsage:true,aiBudgetUsd:true}})
  const platforms = Object.keys(PLATFORM_LABEL)

  const totalToday = platforms.reduce((s, p) => s + (today[p] ?? 0), 0)
  const totalWeek = platforms.reduce((s, p) => s + (week[p] ?? 0), 0)
  const totalAll = platforms.reduce((s, p) => s + (total[p] ?? 0), 0)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-1">Использование AI-платформ</h1>
        <p className="text-sm text-[#6A6D75]">
          Запросов сегодня: <span className="text-[#0F1115] font-mono font-bold">{totalToday}</span>

          {" · "}
          Неделя: <span className="text-[#0F1115] font-mono">{totalWeek}</span>
          {" · "}
          Всего: <span className="text-[#0F1115] font-mono">{totalAll}</span>
        </p>
      </div>

      <section className="mb-8 space-y-3"><h2 className="text-xl">Расходы по аудитам</h2><p className="text-sm text-[#6A6D75]">Оценки по токенам не заменяют счёт провайдера. Неизвестные суммы не считаются нулевыми. При заданном бюджете до вызова резервируется оценка: 0,10 USD для внутренних моделей и 0,05 USD для опроса платформ.</p>{recentUsage.map(job=>{
        const entries=Object.values((job.aiUsage??{}) as Record<string,{stage:string;model:string;state:string;estimatedUsd:number|null;reservedUsd:number;inputTokens?:number;outputTokens?:number}>)
        const known=entries.reduce((n,e)=>n+(e.estimatedUsd??0),0),unknown=entries.filter(e=>e.estimatedUsd==null).length
        return <details key={job.id} className="border p-3"><summary>{job.companyName}: {entries.length} вызовов · известная оценка ${known.toFixed(4)} · без суммы: {unknown} · бюджет: {job.aiBudgetUsd??"не задан"}</summary><table className="w-full text-sm"><thead><tr><th>Этап</th><th>Модель</th><th>Вход / выход</th><th>USD</th><th>Состояние</th></tr></thead><tbody>{entries.map((e,i)=><tr key={i}><td>{e.stage}</td><td>{e.model}</td><td>{e.inputTokens??"?"} / {e.outputTokens??"?"}</td><td>{e.estimatedUsd==null?"Неизвестно":e.estimatedUsd.toFixed(5)}</td><td>{e.state}</td></tr>)}</tbody></table></details>
      })}</section>
      {/* Risk Agent banner */}
      {(() => {
        const RISK_STYLE: Record<string, { bg: string; border: string; icon: string; label: string }> = {
          low:      { bg: "bg-emerald-50", border: "border-emerald-800", icon: "✅", label: "Риск: низкий" },
          medium:   { bg: "bg-amber-50",   border: "border-amber-700",   icon: "⚠️", label: "Риск: средний" },
          high:     { bg: "bg-orange-50",  border: "border-orange-700",  icon: "🔶", label: "Риск: высокий" },
          critical: { bg: "bg-red-50",     border: "border-red-700",     icon: "🚨", label: "КРИТИЧНО" },
        }
        const s = RISK_STYLE[riskReport.riskLevel]
        return (
          <div className={`rounded-xl p-4 mb-6 border ${s.bg} ${s.border}`}>
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">{s.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-bold text-[#0F1115]">{s.label}</span>
                  <span className="text-xs text-[#6A6D75]">
                    Очередь: {riskReport.queueDepth} аудитов в работе
                  </span>
                  {!riskReport.canStartAudit && (
                    <span className="text-xs font-semibold text-red-700">
                      🛑 Новые аудиты заблокированы
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#6A6D75]">{riskReport.recommendation}</p>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Suspended platforms */}
      {inactivePlatforms.length > 0 && (
        <div className="rounded-xl p-4 mb-6 border border-[#E5E5E1] bg-[#F2F1EB]/50">
          <p className="text-sm font-semibold text-[#6A6D75] mb-2">
            ⏸ Приостановлены — нет API-ключа ({inactivePlatforms.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {inactivePlatforms.map(({ key, name }) => (
              <span key={key} className="text-xs px-2 py-1 rounded bg-[#F2F1EB] text-[#6A6D75]">
                {name}
              </span>
            ))}
          </div>
          <p className="text-xs text-[#6A6D75] mt-2">
            Добавь ключ в .env.local → перезапусти сервер → платформа включится автоматически
          </p>
        </div>
      )}

      {/* Active platforms count */}
      <div className="flex items-center gap-2 mb-4 text-xs text-[#6A6D75]">
        <span className="text-emerald-700 font-semibold">● {activePlatforms.length} активных</span>
        <span>из {platforms.length} платформ</span>
        <span className="font-mono">[{activePlatforms.join(", ")}]</span>
      </div>

      {/* Per-platform table */}
      <div className="space-y-3">
        {platforms.map((platform) => {
          const todayCount = today[platform] ?? 0
          const weekCount = week[platform] ?? 0
          const totalCount = total[platform] ?? 0
          const label = PLATFORM_LABEL[platform] ?? platform

          return (
            <div key={platform} className="bg-[#F2F1EB] rounded-xl p-4">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-sm font-semibold text-[#0F1115] w-28 shrink-0">
                  {label}
                </span>
                <span className="text-xs text-emerald-700">Без внутреннего дневного лимита</span>
              </div>
              <div className="flex gap-6 text-xs text-[#6A6D75] pl-0">
                <span>
                  Сегодня:{" "}
                  <span className="font-mono text-[#0F1115]">
                    {todayCount}
                  </span>
                </span>
                <span>
                  Неделя:{" "}
                  <span className="font-mono text-[#0F1115]">{weekCount}</span>
                </span>
                <span>
                  Всего:{" "}
                  <span className="font-mono text-[#0F1115]">{totalCount}</span>
                </span>

              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 mb-10 text-xs text-[#6A6D75]">
        Внутренние дневные лимиты отключены. Статистика за день считается с 00:00 UTC.
        Данные — сохранённые ответы в БД; реальные ограничения и ошибки провайдеров отображаются в диагностике аудита.
      </p>

      {/* Live API health check */}
      <div className="mb-2">
        <p className="text-xs text-[#6A6D75] uppercase tracking-widest mb-3">Здоровье API-ключей</p>
        <PlatformHealth />
      </div>
    </div>
  )
}
