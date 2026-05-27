import { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getClientSession } from "@/lib/client-session"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = {
  title: "Бренд-профили — KaliGEO",
}

export default async function BrandsPage() {
  const clientId = await getClientSession()
  if (!clientId) redirect("/my/login")

  const brands = await prisma.brandProfile.findMany({
    where: { clientId },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/my/dashboard" style={{ fontSize: "13px", color: "var(--ink-3)", textDecoration: "none" }}>
            ← Дашборд
          </Link>
          <h1
            className="mt-4 text-2xl font-bold"
            style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
          >
            Бренд-профили
          </h1>
          <p className="mt-1" style={{ fontSize: "14px", color: "var(--ink-3)" }}>
            Настройте профиль — конкуренты, псевдонимы и кастомные промпты для аудита
          </p>
        </div>
        <Link
          href="/my/brands/new"
          style={{
            padding: "10px 20px",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          + Новый профиль
        </Link>
      </div>

      {brands.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: "var(--bone-2)", border: "1px solid var(--rule)" }}
        >
          <p style={{ color: "var(--ink-3)", fontSize: "14px" }}>
            Нет профилей. Создайте первый, чтобы настроить аудит под ваш бренд.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {brands.map((b) => (
            <Link
              key={b.id}
              href={`/my/brands/${b.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--rule)",
                background: "var(--bone)",
                textDecoration: "none",
                color: "var(--ink)",
              }}
            >
              <div>
                <p style={{ fontWeight: 600, fontSize: "14px" }}>{b.companyName}</p>
                <p style={{ fontSize: "12px", color: "var(--ink-3)", marginTop: "2px" }}>
                  {b.websiteUrl}
                  {b.niche ? ` · ${b.niche}` : ""}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {b.alternativeNames.length > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                    {b.alternativeNames.length} псевд.
                  </span>
                )}
                {Array.isArray(b.customPrompts) && (b.customPrompts as unknown[]).length > 0 && (
                  <span style={{ fontSize: "11px", color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>
                    {(b.customPrompts as unknown[]).length} промптов
                  </span>
                )}
                <span style={{ fontSize: "14px", color: "var(--ink-3)" }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
