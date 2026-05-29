import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = req.nextUrl.searchParams.get("token")

  const job = await prisma.auditJob.findUnique({
    where: { id },
    include: { report: true },
  })

  if (!job || !job.report) {
    return NextResponse.json({ error: "Отчёт не найден" }, { status: 404 })
  }
  if (job.reportToken !== token) {
    return NextResponse.json({ error: "Неверный токен" }, { status: 403 })
  }

  const report = job.report
  type PS = { platform: string; score: number; citationRate: number; mentionCount: number; totalQueries: number }
  const scores = report.visibilityScores as Record<string, PS>
  const weakPoints = report.weakPoints as { id: string; title: string; description: string; severity: string }[]
  const actionPlan = report.actionPlan as {
    strategy?: string
    quickWins?: { action: string; howTo: string; timeEstimate: string; impact: string }[]
    "30d"?: { title: string; description: string; effort: string; impact: string }[]
    "60d"?: { title: string; description: string; effort: string; impact: string }[]
    "90d"?: { title: string; description: string; effort: string; impact: string }[]
  }

  const scoreColor = (s: number) => s >= 60 ? "#16a34a" : s >= 30 ? "#d97706" : "#dc2626"
  const severityColor = (s: string) => s === "high" ? "#dc2626" : s === "medium" ? "#d97706" : "#6b7280"

  const platformRows = Object.values(scores).map((s) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-weight:500">${s.platform}</td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right">
        <span style="font-size:20px;font-weight:700;color:${scoreColor(s.score)}">${s.score}</span>
        <span style="color:#9ca3af">/100</span>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;text-align:right;color:#6b7280">
        ${s.mentionCount}/${s.totalQueries} упоминаний
      </td>
    </tr>`).join("")

  const weakRows = weakPoints.slice(0, 8).map((w) => `
    <div style="padding:14px 0;border-bottom:1px solid #f3f4f6">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <span style="font-size:11px;font-weight:600;color:${severityColor(w.severity)};text-transform:uppercase;letter-spacing:.06em">${w.severity}</span>
        <span style="font-weight:600;color:#111827">${w.title}</span>
      </div>
      <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6">${w.description}</p>
    </div>`).join("")

  const renderItems = (items?: { title: string; description: string; effort: string; impact: string }[]) =>
    (items ?? []).map((item) => `
      <div style="padding:14px;border-radius:8px;border:1px solid #e5e7eb;margin-bottom:10px">
        <div style="font-weight:600;color:#111827;margin-bottom:4px">${item.title}</div>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280">${item.description}</p>
        <span style="font-size:11px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:4px;padding:2px 7px;color:#6b7280">
          усилия: ${item.effort} · влияние: ${item.impact}
        </span>
      </div>`).join("")

  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>KaliGEO — ${job.companyName} — AI-аудит</title>
<style>
  *{box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;margin:0;padding:0}
  .page{max-width:860px;margin:0 auto;padding:40px 24px}
  h1,h2,h3{letter-spacing:-0.02em}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:28px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse}
  @media print{body{background:#fff}.page{padding:20px}}
</style>
</head>
<body>
<div class="page">

  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:32px">
    <div>
      <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;font-weight:600">KaliGEO · AI Search Visibility Audit</div>
      <h1 style="margin:6px 0 0;font-size:28px">${job.companyName}</h1>
      <p style="margin:4px 0 0;font-size:14px;color:#6b7280">${job.websiteUrl} · ${new Date(job.completedAt ?? job.createdAt).toLocaleDateString("ru-RU")}</p>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em">AI Score</div>
      <div style="font-size:64px;font-weight:700;line-height:1;color:${scoreColor(report.overallScore)}">${report.overallScore}</div>
      <div style="font-size:16px;color:#9ca3af">/100</div>
    </div>
  </div>

  <div class="card">
    <h2 style="margin:0 0 20px;font-size:18px">Результаты по платформам</h2>
    <table>${platformRows}</table>
  </div>

  <div class="card">
    <h2 style="margin:0 0 16px;font-size:18px">Ключевые проблемы</h2>
    ${weakRows}
  </div>

  ${actionPlan.strategy ? `
  <div class="card">
    <h2 style="margin:0 0 12px;font-size:18px">Стратегия</h2>
    <p style="margin:0;color:#374151;line-height:1.7">${actionPlan.strategy}</p>
  </div>` : ""}

  ${(actionPlan["30d"] ?? []).length > 0 ? `
  <div class="card">
    <h2 style="margin:0 0 16px;font-size:18px">План роста — 30 дней</h2>
    ${renderItems(actionPlan["30d"])}
  </div>` : ""}

  ${(actionPlan["60d"] ?? []).length > 0 ? `
  <div class="card">
    <h2 style="margin:0 0 16px;font-size:18px">60 дней</h2>
    ${renderItems(actionPlan["60d"])}
  </div>` : ""}

  ${(actionPlan["90d"] ?? []).length > 0 ? `
  <div class="card">
    <h2 style="margin:0 0 16px;font-size:18px">90 дней</h2>
    ${renderItems(actionPlan["90d"])}
  </div>` : ""}

  <div style="text-align:center;padding:32px 0;color:#9ca3af;font-size:13px">
    Сгенерировано KaliGEO · kaligeo.ru · ${new Date().toLocaleDateString("ru-RU")}
  </div>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="kaligeo-${job.companyName.replace(/[^a-zа-я0-9]/gi, "-")}-${new Date().toISOString().slice(0, 10)}.html"`,
    },
  })
}
