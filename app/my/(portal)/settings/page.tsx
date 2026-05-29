import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = { title: "Настройки — KaliGEO" }

const MONITOR_TIERS = new Set(["MONITOR_START", "MONITOR_PRO", "MONITOR_AGENT"])

export default async function SettingsPage() {
  const clientId = await getClientSession()
  if (!clientId) redirect("/my/login")

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { email: true, companyName: true },
  })
  if (!client) redirect("/my/login")

  // Последний MONITOR-аудит
  const monitorJob = await prisma.auditJob.findFirst({
    where: {
      clientId,
      subscriptionActiveUntil: { gt: new Date() },
    },
    orderBy: { completedAt: "desc" },
  })

  const isMonitor = monitorJob && MONITOR_TIERS.has(monitorJob.subscriptionTier ?? "")
  const nextAlertDate = (() => {
    const d = new Date()
    // Следующая пятница
    const day = d.getDay()
    const daysUntilFriday = (5 - day + 7) % 7 || 7
    d.setDate(d.getDate() + daysUntilFriday)
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
  })()

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".08em" }}>— Личный кабинет</p>
        <h1 style={{ margin: "4px 0 0", fontSize: "clamp(20px,4vw,26px)", fontFamily: "var(--font-serif)", fontWeight: 400 }}>
          Настройки мониторинга
        </h1>
      </div>

      {/* Alert settings */}
      <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--rule)", background: "var(--bone-2)" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".07em" }}>Алёрты</p>
          <h2 style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 600 }}>Уведомления о падении видимости</h2>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <Row label="Email для алёртов" value={client.email} />
          <Row label="Порог срабатывания" value="−10 пунктов от предыдущего аудита" />
          <Row label="Частота проверки" value="Еженедельно (каждую пятницу)" />
          <Row
            label="Следующая проверка"
            value={isMonitor ? nextAlertDate : "—"}
            note={!isMonitor ? "Доступно на тарифах MONITOR" : undefined}
          />
        </div>
      </div>

      {/* Subscription info */}
      <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--rule)", background: "var(--bone-2)" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".07em" }}>Подписка</p>
          <h2 style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 600 }}>Текущий план</h2>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {isMonitor && monitorJob ? (
            <>
              <Row label="Тариф" value={monitorJob.subscriptionTier ?? "—"} />
              <Row
                label="Активен до"
                value={monitorJob.subscriptionActiveUntil
                  ? new Date(monitorJob.subscriptionActiveUntil).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
              />
              <Row label="Последний аудит" value={monitorJob.companyName} />
            </>
          ) : (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p style={{ margin: "0 0 12px", color: "var(--ink-2)", fontSize: "14px" }}>
                У вас нет активной подписки на мониторинг
              </p>
              <a
                href="/pricing"
                style={{ display: "inline-block", padding: "10px 22px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--accent-ink)", fontSize: "14px", fontWeight: 700, textDecoration: "none" }}
              >
                Подключить мониторинг →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Account */}
      <div style={{ border: "1px solid var(--rule)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid var(--rule)", background: "var(--bone-2)" }}>
          <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: ".07em" }}>Аккаунт</p>
          <h2 style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 600 }}>Данные профиля</h2>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <Row label="Email" value={client.email} />
          <Row label="Компания" value={client.companyName} />
          <div style={{ paddingTop: "8px", borderTop: "1px solid var(--rule)" }}>
            <a
              href="/api/client/auth/logout"
              style={{ fontSize: "13px", color: "var(--ink-3)", textDecoration: "underline", textUnderlineOffset: "2px" }}
            >
              Выйти из аккаунта
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px" }}>
      <span style={{ fontSize: "13px", color: "var(--ink-3)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "13px", color: "var(--ink-2)", fontWeight: 500, textAlign: "right" }}>
        {value}
        {note && <span style={{ display: "block", fontSize: "11px", color: "var(--ink-3)", fontWeight: 400 }}>{note}</span>}
      </span>
    </div>
  )
}
