"use client"

import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts"
import type { ShareOfVoiceResult } from "@/lib/analysis/share-of-voice"
import type { CompetitivePosition } from "@/lib/analysis/competitive-positioning"

interface ShareOfVoiceTabProps {
  companyName: string
  sov: ShareOfVoiceResult
  positioning: CompetitivePosition
}

const COLORS = ["#1A1C22", "#4F7DFF", "#F0A500", "#22C55E", "#EF4444", "#A855F7", "#06B6D4"]

const CATEGORY_LABELS: Record<string, string> = {
  recommendation: "Топ-рекомендации",
  comparison:     "Сравнения",
  position:       "Позиционирование",
  problem:        "Проблемы",
  conversational: "Разговорные",
}

const STRENGTH_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  strong:      { label: "Лидер",       color: "#166534", bg: "#dcfce7" },
  competitive: { label: "В игре",      color: "#854d0e", bg: "#fef9c3" },
  weak:        { label: "Отстаём",     color: "#991b1b", bg: "#fee2e2" },
}

// Красивый тултип для пай-чарта
function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-sm shadow-lg"
      style={{ background: "var(--ink)", color: "#fff", border: "none" }}
    >
      <span className="font-semibold">{payload[0].name}</span>
      <span className="ml-2">{payload[0].value}%</span>
    </div>
  )
}

export function ShareOfVoiceTab({ companyName, sov, positioning }: ShareOfVoiceTabProps) {
  const strength = STRENGTH_CONFIG[positioning.positioningStrength] ?? STRENGTH_CONFIG.weak

  // Данные для пай-чарта: бренд + конкуренты
  const pieData = [
    { name: companyName, value: sov.mentionShare.brand },
    ...Object.entries(sov.mentionShare.competitors).map(([name, pct]) => ({ name, value: pct })),
  ].filter((d) => d.value > 0)

  // Данные для bar-чарта по категориям
  const categoryData = Object.entries(sov.byQueryCategory).map(([cat, value]) => ({
    name: CATEGORY_LABELS[cat] ?? cat,
    SoV: value,
  }))

  // Данные по платформам
  const platformData = Object.entries(sov.byPlatform).map(([platform, value]) => ({
    name: platform,
    SoV: value,
  })).sort((a, b) => b.SoV - a.SoV)

  return (
    <div className="space-y-10">
      {/* ── Заголовок + позиционирование ── */}
      <div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "var(--ink)" }}>
          Share of Voice & Позиционирование
        </h2>
        <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
          Доля упоминаний бренда среди всех конкурентов в AI-ответах
        </p>

        {/* Карточки метрик */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Share of Voice"
            value={`${sov.overall}%`}
            sub="от всех упоминаний"
            accent={sov.overall >= 40}
          />
          <MetricCard
            label="Место в нише"
            value={`#${positioning.rank}`}
            sub={`из ${positioning.totalParticipants} игроков`}
            accent={positioning.rank === 1}
          />
          <MetricCard
            label="Первое упоминание"
            value={`${positioning.firstMentionRate}%`}
            sub="запросов, где первые"
            accent={positioning.firstMentionRate >= 30}
          />
          <MetricCard
            label="Позиция"
            value={strength.label}
            sub={positioning.positioningStrength === "strong" ? "Лидируете в нише" : "Есть куда расти"}
            accent={positioning.positioningStrength === "strong"}
            valueStyle={{ color: strength.color, background: strength.bg, padding: "2px 10px", borderRadius: "999px", fontSize: "14px" }}
          />
        </div>
      </div>

      {/* ── Пай-чарт: распределение упоминаний ── */}
      {pieData.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
        >
          <h3 className="text-base font-semibold mb-1" style={{ color: "var(--ink)" }}>
            Распределение упоминаний
          </h3>
          <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
            Бренд vs конкуренты — кто чаще всего упоминается в AI
          </p>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Легенда */}
            <div className="flex flex-col gap-2 flex-1">
              {pieData.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block rounded-sm flex-shrink-0"
                      style={{ width: 12, height: 12, background: COLORS[i % COLORS.length] }}
                    />
                    <span className="text-sm" style={{ color: i === 0 ? "var(--ink)" : "var(--ink-2)", fontWeight: i === 0 ? 600 : 400 }}>
                      {d.name}
                      {i === 0 && <span className="ml-1 text-xs" style={{ color: "var(--ink-3)" }}>← вы</span>}
                    </span>
                  </div>
                  <span className="text-sm font-mono font-semibold" style={{ color: "var(--ink)" }}>
                    {d.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SoV по типам запросов ── */}
      <div
        className="rounded-xl p-6"
        style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
      >
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--ink)" }}>
          SoV по типам запросов
        </h3>
        <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
          Где бренд упоминается чаще — в рекомендациях, сравнениях или проблемных запросах
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={categoryData} margin={{ top: 0, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--rule)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--ink-3)" }} />
            <YAxis tick={{ fontSize: 11, fill: "var(--ink-3)" }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              formatter={(v) => [`${v}%`, "Share of Voice"]}
              contentStyle={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="SoV" fill="#1A1C22" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── SoV по платформам ── */}
      {platformData.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
        >
          <h3 className="text-base font-semibold mb-1" style={{ color: "var(--ink)" }}>
            SoV по платформам
          </h3>
          <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
            На каких AI-платформах бренд упоминается чаще конкурентов
          </p>
          <div className="space-y-3">
            {platformData.map((p) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-sm font-mono w-24 shrink-0" style={{ color: "var(--ink-2)" }}>
                  {p.name}
                </span>
                <div className="flex-1 rounded-full h-2" style={{ background: "var(--bone-2)" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${Math.max(2, p.SoV)}%`, background: p.SoV >= 50 ? "#166534" : p.SoV >= 25 ? "#854d0e" : "var(--ink-3)" }}
                  />
                </div>
                <span className="text-sm font-semibold w-10 text-right" style={{ color: "var(--ink)" }}>
                  {p.SoV}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Рейтинг по категориям ── */}
      <div
        className="rounded-xl p-6"
        style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
      >
        <h3 className="text-base font-semibold mb-1" style={{ color: "var(--ink)" }}>
          Позиция по типам запросов
        </h3>
        <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
          Место среди конкурентов в каждой категории запросов
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(positioning.categoryRanking).map(([cat, { rank, total }]) => {
            if (total <= 1) return null
            const isFirst = rank === 1
            return (
              <div
                key={cat}
                className="rounded-lg px-4 py-3"
                style={{
                  background: isFirst ? "#dcfce7" : "var(--bone-2)",
                  border: `1px solid ${isFirst ? "#86efac" : "var(--rule)"}`,
                }}
              >
                <div className="text-xs mb-1" style={{ color: isFirst ? "#166534" : "var(--ink-3)" }}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </div>
                <div className="font-bold text-lg" style={{ color: isFirst ? "#166534" : "var(--ink)" }}>
                  #{rank} <span className="text-sm font-normal" style={{ color: "var(--ink-3)" }}>из {total}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Конкуренты ── */}
      {positioning.competitors.length > 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: "var(--card)", border: "1px solid var(--rule)" }}
        >
          <h3 className="text-base font-semibold mb-5" style={{ color: "var(--ink)" }}>
            Конкурентная доля по игрокам
          </h3>
          <div className="space-y-3">
            {positioning.competitors.map((c, i) => (
              <div key={c.name} className="flex items-center gap-3">
                <span className="text-xs font-mono w-4 text-right" style={{ color: "var(--ink-3)" }}>
                  {i + 1}.
                </span>
                <span className="text-sm w-40 truncate" style={{ color: "var(--ink-2)" }} title={c.name}>
                  {c.name}
                </span>
                <div className="flex-1 rounded-full h-2" style={{ background: "var(--bone-2)" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${Math.max(2, c.mentionShare)}%`, background: "#4F7DFF" }}
                  />
                </div>
                <span className="text-sm font-semibold w-12 text-right font-mono" style={{ color: "var(--ink)" }}>
                  {c.mentionShare}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Utility sub-component ────────────────────────────────────────────────────

interface MetricCardProps {
  label: string
  value: string
  sub: string
  accent?: boolean
  valueStyle?: React.CSSProperties
}

function MetricCard({ label, value, sub, accent, valueStyle }: MetricCardProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: accent ? "var(--ink)" : "var(--card)",
        border: `1px solid ${accent ? "var(--ink)" : "var(--rule)"}`,
      }}
    >
      <p className="text-xs mb-1" style={{ color: accent ? "rgba(255,255,255,0.55)" : "var(--ink-3)" }}>
        {label}
      </p>
      <p
        className="text-2xl font-bold mb-0.5"
        style={valueStyle ?? { color: accent ? "#fff" : "var(--ink)", fontFamily: "var(--font-serif)" }}
      >
        {value}
      </p>
      <p className="text-xs" style={{ color: accent ? "rgba(255,255,255,0.45)" : "var(--ink-3)" }}>
        {sub}
      </p>
    </div>
  )
}
