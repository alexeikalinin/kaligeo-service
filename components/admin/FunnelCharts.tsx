"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

type WeeklyDataPoint = {
  week: string
  created: number
  completed: number
  revenue: number
}

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid #3f3f46",
  borderRadius: "8px",
  color: "#e4e4e7",
  fontSize: "12px",
}

export function FunnelCharts({ weeklyData }: { weeklyData: WeeklyDataPoint[] }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Jobs per week */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <p className="text-xs text-zinc-500 mb-4 uppercase tracking-wider">Заявки по неделям</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: "#71717a" }}
            />
            <Bar dataKey="created" name="Создано" fill="#3f3f46" radius={[3, 3, 0, 0]} />
            <Bar dataKey="completed" name="Завершено" fill="#059669" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Revenue per week */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <p className="text-xs text-zinc-500 mb-4 uppercase tracking-wider">Выручка по неделям, ₽</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#71717a", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => v >= 1000 ? `${v / 1000}k` : String(v)}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              formatter={(v) => [`${Number(v ?? 0).toLocaleString("ru-RU")} ₽`, "Выручка"]}
            />
            <Bar dataKey="revenue" name="Выручка" fill="#7c3aed" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
