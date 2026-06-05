import { Metadata } from "next"
import { redirect } from "next/navigation"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"
import { TIER_CONFIG, type Tier } from "@/lib/gates"

export const metadata: Metadata = {
  title: "Тариф и оплата — KaliGEO",
}

const TIER_LABELS: Record<string, string> = {
  BASIC: "Старт",
  STANDARD: "Профи",
  ADVANCED: "Агентский",
  MONITOR_START: "Мониторинг Старт",
  MONITOR_PRO: "Мониторинг Профи",
  MONITOR_AGENT: "Мониторинг Агент",
}

function formatDate(d: Date | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
}

export default async function BillingPage() {
  const clientId = await getClientSession()
  if (!clientId) redirect("/my/login")

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { email: true, companyName: true },
  })

  const paidJobs = await prisma.auditJob.findMany({
    where: { clientId, paidAt: { not: null } },
    select: {
      id: true,
      tier: true,
      companyName: true,
      paidAt: true,
      completedAt: true,
      alfaBankOrderId: true,
      status: true,
      source: true,
    },
    orderBy: { paidAt: "desc" },
  })

  const latestPaid = paidJobs[0]
  const isTrial = latestPaid?.source === "trial"
  const currentTier = latestPaid?.tier as Tier | undefined
  const tierConfig = currentTier ? TIER_CONFIG[currentTier] : null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Header */}
      <div>
        <p style={{ margin: 0, fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          — Личный кабинет
        </p>
        <h1
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(22px, 4vw, 30px)",
            fontWeight: 400,
            margin: "4px 0 0",
            color: "var(--ink)",
          }}
        >
          Тариф и оплата
        </h1>
      </div>

      {/* Current plan */}
      <section>
        <SectionTitle>Текущий тариф</SectionTitle>
        {tierConfig ? (
          <div
            style={{
              background: "var(--bone-2)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-lg)",
              padding: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                <span
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "22px",
                    fontWeight: 400,
                    color: "var(--ink)",
                  }}
                >
                  {TIER_LABELS[currentTier!] ?? currentTier}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    background: tierConfig.isSubscription ? "var(--accent)" : "var(--bone)",
                    color: tierConfig.isSubscription ? "var(--accent-ink)" : "var(--ink-3)",
                    border: tierConfig.isSubscription ? "none" : "1px solid var(--rule)",
                    borderRadius: "3px",
                    padding: "2px 8px",
                    fontWeight: 700,
                  }}
                >
                  {isTrial ? "ПРОБНЫЙ" : tierConfig.isSubscription ? "ПОДПИСКА" : "РАЗОВЫЙ"}
                </span>
              </div>
              <div style={{ fontSize: "13px", color: "var(--ink-3)", display: "flex", flexDirection: "column", gap: "3px" }}>
                <span>{tierConfig.platforms.length} платформ · {tierConfig.queryCount} запросов</span>
                {latestPaid && !isTrial && <span>Последняя оплата: {formatDate(latestPaid.paidAt)}</span>}
                {isTrial && <span>Бесплатный пробный аудит</span>}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                {isTrial ? "Бесплатно" : tierConfig.priceLabel}
              </span>
              <a
                href="/pricing"
                style={{
                  fontSize: "13px",
                  color: "var(--ink-3)",
                  textDecoration: "none",
                  borderBottom: "1px solid var(--rule)",
                }}
              >
                Изменить тариф →
              </a>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--bone-2)",
              border: "1px dashed var(--rule)",
              borderRadius: "var(--radius-lg)",
              padding: "32px 24px",
              textAlign: "center",
            }}
          >
            <p style={{ fontFamily: "var(--font-serif)", fontSize: "18px", fontWeight: 400, margin: "0 0 8px", color: "var(--ink)" }}>
              Нет активного тарифа
            </p>
            <p style={{ fontSize: "13px", color: "var(--ink-3)", margin: "0 0 20px" }}>
              Выберите тариф чтобы запустить первый аудит.
            </p>
            <a
              href="/pricing"
              style={{
                display: "inline-block",
                background: "var(--accent)",
                color: "var(--accent-ink)",
                borderRadius: "var(--radius-md)",
                padding: "10px 20px",
                fontSize: "14px",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Выбрать тариф →
            </a>
          </div>
        )}
      </section>

      {/* Payment history */}
      {paidJobs.length > 0 && (
        <section>
          <SectionTitle>История платежей</SectionTitle>
          <div style={{ borderRadius: "var(--radius-lg)", border: "1px solid var(--rule)", overflow: "hidden" }}>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 130px 120px 100px",
                padding: "10px 20px",
                background: "var(--bone-2)",
                borderBottom: "1px solid var(--rule)",
                gap: "12px",
              }}
            >
              {["Аудит", "Тариф", "Сумма", "Дата"].map((h) => (
                <span
                  key={h}
                  style={{ fontFamily: "var(--font-mono)", fontSize: "10px", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--ink-3)" }}
                >
                  {h}
                </span>
              ))}
            </div>
            {paidJobs.map((job) => {
              const tc = TIER_CONFIG[job.tier as Tier]
              return (
                <div
                  key={job.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 130px 120px 100px",
                    padding: "14px 20px",
                    borderTop: "1px solid var(--rule)",
                    gap: "12px",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 500, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {job.companyName}
                    </div>
                    {job.alfaBankOrderId && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-3)", marginTop: "2px" }}>
                        #{job.alfaBankOrderId.slice(0, 12)}…
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      background: "var(--bone)",
                      border: "1px solid var(--rule)",
                      borderRadius: "var(--radius-sm)",
                      padding: "2px 8px",
                      color: "var(--ink-3)",
                      whiteSpace: "nowrap",
                      width: "fit-content",
                    }}
                  >
                    {TIER_LABELS[job.tier] ?? job.tier}
                  </span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>
                    {job.source === "trial" ? "Бесплатно" : (tc?.priceLabel ?? "—")}
                  </span>
                  <span style={{ fontSize: "13px", color: "var(--ink-3)", whiteSpace: "nowrap" }}>
                    {formatDate(job.paidAt)}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      <section>
        <SectionTitle>Следующий аудит</SectionTitle>
        <div
          style={{
            background: "var(--bone-2)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--ink-2)", margin: 0 }}>
            Рекомендуем проводить аудит раз в месяц — AI-платформы обновляют знания и позиции брендов меняются.
          </p>
          <a
            href="/pricing"
            style={{
              display: "inline-block",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              borderRadius: "var(--radius-md)",
              padding: "11px 22px",
              fontSize: "14px",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Заказать аудит →
          </a>
        </div>
      </section>

      {/* B2B invoice block */}
      <section>
        <SectionTitle>Счёт для юр. лица</SectionTitle>
        <div
          style={{
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <p style={{ fontSize: "14px", color: "var(--ink-2)", margin: 0 }}>
            Работаем с юридическими лицами РФ и РБ. Выставляем счёт на оплату, предоставляем закрывающие документы (акт, счёт-фактура).
          </p>
          <div style={{ fontSize: "13px", color: "var(--ink-3)", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span>Email: <a href="mailto:hello@kaligeo.ru" style={{ color: "var(--ink)", textDecoration: "none", borderBottom: "1px solid var(--rule)" }}>hello@kaligeo.ru</a></span>
            <span>Укажите: название компании, ИНН, нужный тариф — пришлём счёт в течение 1 рабочего дня.</span>
          </div>
        </div>
      </section>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", margin: "0 0 12px" }}>
      — {children}
    </h2>
  )
}
