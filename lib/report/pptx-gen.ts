import pptxgen from "pptxgenjs"

// KaliGEO brandbook colours
const C = {
  bone:    "FAFAF7",
  bone2:   "F2F2ED",
  ink:     "0F1115",
  ink2:    "374151",
  ink3:    "9CA3AF",
  lime:    "A3E635",
  rule:    "E8E8E3",
  success: "16A34A",
  warn:    "D97706",
  danger:  "DC2626",
}

type PlatformScore = {
  platform: string
  score: number
  mentionCount: number
  totalQueries: number
}

type WeakPoint = {
  title: string
  description: string
  severity: "high" | "medium" | "low"
}

type ActionItem = {
  title: string
  description: string
  effort?: string
  impact?: string
}

type CompetitorEntry = {
  name: string
  platforms?: string[]
  mentionCount?: number
}

export interface PptxReportData {
  companyName: string
  websiteUrl: string
  completedAt: Date | null
  overallScore: number
  visibilityScores: Record<string, PlatformScore>
  weakPoints: WeakPoint[]
  actionPlan: {
    strategy?: string
    "30d"?: ActionItem[]
    "60d"?: ActionItem[]
    "90d"?: ActionItem[]
  }
  competitorMatrix?: CompetitorEntry[]
}

function scoreColor(score: number): string {
  if (score >= 60) return C.success
  if (score >= 30) return C.warn
  return C.danger
}

function scoreLabel(score: number): string {
  if (score >= 60) return "Хорошая видимость"
  if (score >= 30) return "Средняя видимость"
  return "Низкая видимость"
}

const MONO = "Courier New"
const SERIF = "Georgia"
const SANS = "Calibri"

export async function generatePptx(data: PptxReportData): Promise<Buffer> {
  const prs = new pptxgen()

  prs.layout = "LAYOUT_WIDE" // 13.33" x 7.5"
  prs.author = "KaliGEO"
  prs.company = "KaliGEO"
  prs.subject = `AI-аудит: ${data.companyName}`
  prs.title = `KaliGEO · ${data.companyName}`

  const dateStr = data.completedAt
    ? new Date(data.completedAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })

  const platforms = Object.values(data.visibilityScores)
  const totalMentions = platforms.reduce((a, s) => a + s.mentionCount, 0)
  const totalQueries = platforms.reduce((a, s) => a + s.totalQueries, 0)

  // ── Helpers ────────────────────────────────────────────────────────────────

  function addBg(slide: pptxgen.Slide, color = C.bone) {
    slide.background = { color }
  }

  function eyebrow(slide: pptxgen.Slide, text: string, x: number, y: number) {
    slide.addText(text, {
      x, y, w: 10, h: 0.25,
      fontFace: MONO, fontSize: 8, color: C.ink3,
      charSpacing: 2,
    })
  }

  function heading(slide: pptxgen.Slide, text: string, x: number, y: number, w = 12, size = 28) {
    slide.addText(text, {
      x, y, w, h: 0.7,
      fontFace: SERIF, fontSize: size, color: C.ink,
      bold: false,
    })
  }

  function divider(slide: pptxgen.Slide, y: number) {
    slide.addShape(prs.ShapeType.rect, {
      x: 0.5, y, w: 12.33, h: 0.01,
      fill: { color: C.rule },
      line: { color: C.rule, width: 0 },
    })
  }

  function footer(slide: pptxgen.Slide) {
    slide.addText(`KaliGEO · kaligeo.ru · ${dateStr}`, {
      x: 0.5, y: 7.1, w: 12.33, h: 0.25,
      fontFace: MONO, fontSize: 7, color: C.ink3, align: "center",
    })
  }

  // ── Slide 1: Cover ─────────────────────────────────────────────────────────

  const s1 = prs.addSlide()
  addBg(s1)

  // Lime accent bar
  s1.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: 7.5,
    fill: { color: C.lime },
    line: { color: C.lime, width: 0 },
  })

  eyebrow(s1, "— KALIGEO · AI SEARCH VISIBILITY AUDIT", 0.4, 0.5)

  heading(s1, data.companyName, 0.4, 1.1, 7, 36)

  s1.addText(data.websiteUrl, {
    x: 0.4, y: 1.95, w: 7, h: 0.3,
    fontFace: MONO, fontSize: 11, color: C.ink3,
  })

  s1.addText(dateStr, {
    x: 0.4, y: 2.35, w: 7, h: 0.3,
    fontFace: SANS, fontSize: 12, color: C.ink3,
  })

  // Score block (right)
  s1.addShape(prs.ShapeType.rect, {
    x: 9, y: 0.8, w: 3.8, h: 3.2,
    fill: { color: C.bone2 },
    line: { color: C.rule, width: 1 },
    rectRadius: 0.12,
  })

  s1.addText(String(data.overallScore), {
    x: 9, y: 1.05, w: 3.8, h: 1.8,
    fontFace: MONO, fontSize: 96, bold: true,
    color: scoreColor(data.overallScore), align: "center",
  })

  s1.addText("/100", {
    x: 9, y: 2.8, w: 3.8, h: 0.4,
    fontFace: MONO, fontSize: 14, color: C.ink3, align: "center",
  })

  s1.addText(scoreLabel(data.overallScore).toUpperCase(), {
    x: 9, y: 3.25, w: 3.8, h: 0.4,
    fontFace: MONO, fontSize: 9, color: scoreColor(data.overallScore),
    align: "center", charSpacing: 1.5,
  })

  // Stats row
  const stats = [
    { label: "Платформ", value: String(platforms.length) },
    { label: "Упоминаний", value: `${totalMentions}/${totalQueries}` },
    { label: "Слабых мест", value: String(data.weakPoints.length) },
  ]
  stats.forEach((stat, i) => {
    const x = 0.4 + i * 3.1
    s1.addText(stat.value, {
      x, y: 4.5, w: 2.8, h: 0.5,
      fontFace: MONO, fontSize: 26, bold: true, color: C.ink,
    })
    s1.addText(stat.label.toUpperCase(), {
      x, y: 5.05, w: 2.8, h: 0.3,
      fontFace: MONO, fontSize: 8, color: C.ink3, charSpacing: 1.5,
    })
  })

  footer(s1)

  // ── Slide 2: Platform Scores ──────────────────────────────────────────────

  const s2 = prs.addSlide()
  addBg(s2)

  eyebrow(s2, "— ПЛАТФОРМЫ", 0.5, 0.3)
  heading(s2, "Видимость по платформам", 0.5, 0.65)
  divider(s2, 1.5)

  const platformRows = platforms.map((p) => [
    { text: p.platform, options: { fontFace: MONO, fontSize: 11, color: C.ink, bold: true } },
    {
      text: String(p.score),
      options: { fontFace: MONO, fontSize: 20, bold: true, color: scoreColor(p.score), align: "center" as const },
    },
    {
      text: `${p.mentionCount} / ${p.totalQueries}`,
      options: { fontFace: MONO, fontSize: 11, color: C.ink3, align: "center" as const },
    },
    {
      text: `${Math.round((p.mentionCount / Math.max(1, p.totalQueries)) * 100)}%`,
      options: { fontFace: MONO, fontSize: 13, bold: true, color: C.ink2, align: "center" as const },
    },
  ])

  s2.addTable(
    [
      [
        { text: "ПЛАТФОРМА", options: { fontFace: MONO, fontSize: 8, color: C.ink3 } },
        { text: "СКОР", options: { fontFace: MONO, fontSize: 8, color: C.ink3, align: "center" } },
        { text: "УПОМИНАНИЙ", options: { fontFace: MONO, fontSize: 8, color: C.ink3, align: "center" } },
        { text: "COVERAGE", options: { fontFace: MONO, fontSize: 8, color: C.ink3, align: "center" } },
      ],
      ...platformRows,
    ],
    {
      x: 0.5, y: 1.7, w: 12.33,
      rowH: 0.52,
      colW: [5, 2, 2.5, 2.33],
      border: { pt: 1, color: C.rule },
      fill: { color: C.bone },
    }
  )

  footer(s2)

  // ── Slide 3: Weak Points ──────────────────────────────────────────────────

  const s3 = prs.addSlide()
  addBg(s3)

  eyebrow(s3, "— КЛЮЧЕВЫЕ ПРОБЛЕМЫ", 0.5, 0.3)
  heading(s3, "Слабые места", 0.5, 0.65)
  divider(s3, 1.5)

  const topWeak = data.weakPoints.slice(0, 5)
  topWeak.forEach((wp, i) => {
    const y = 1.65 + i * 1.05
    const sevColor = wp.severity === "high" ? C.danger : wp.severity === "medium" ? C.warn : C.ink3
    const sevLabel = wp.severity === "high" ? "КРИТИЧНО" : wp.severity === "medium" ? "ВАЖНО" : "НИЗКИЙ"

    s3.addShape(prs.ShapeType.rect, {
      x: 0.5, y: y - 0.04, w: 0.06, h: 0.85,
      fill: { color: sevColor },
      line: { color: sevColor, width: 0 },
    })

    s3.addText(sevLabel, {
      x: 0.75, y, w: 1.8, h: 0.22,
      fontFace: MONO, fontSize: 7.5, color: sevColor, charSpacing: 1,
    })

    s3.addText(wp.title, {
      x: 0.75, y: y + 0.22, w: 11.5, h: 0.28,
      fontFace: SANS, fontSize: 13, bold: true, color: C.ink,
    })

    s3.addText(wp.description.slice(0, 160), {
      x: 0.75, y: y + 0.5, w: 11.5, h: 0.32,
      fontFace: SANS, fontSize: 10, color: C.ink3,
    })
  })

  footer(s3)

  // ── Slide 4: Competitor Matrix ────────────────────────────────────────────

  const s4 = prs.addSlide()
  addBg(s4)

  eyebrow(s4, "— КОНКУРЕНТЫ", 0.5, 0.3)
  heading(s4, "Конкурентная матрица", 0.5, 0.65)
  divider(s4, 1.5)

  const competitors = (data.competitorMatrix ?? []).slice(0, 8)

  if (competitors.length > 0) {
    const compRows = competitors.map((c) => [
      { text: c.name, options: { fontFace: SANS, fontSize: 12, bold: true, color: C.ink } },
      {
        text: String(c.mentionCount ?? 0),
        options: { fontFace: MONO, fontSize: 14, bold: true, color: C.ink2, align: "center" as const },
      },
      {
        text: (c.platforms ?? []).join(", ") || "—",
        options: { fontFace: MONO, fontSize: 9, color: C.ink3 },
      },
    ])

    s4.addTable(
      [
        [
          { text: "КОНКУРЕНТ", options: { fontFace: MONO, fontSize: 8, color: C.ink3 } },
          { text: "УПОМИНАНИЙ", options: { fontFace: MONO, fontSize: 8, color: C.ink3, align: "center" } },
          { text: "ПЛАТФОРМЫ", options: { fontFace: MONO, fontSize: 8, color: C.ink3 } },
        ],
        ...compRows,
      ],
      {
        x: 0.5, y: 1.7, w: 12.33,
        rowH: 0.55,
        colW: [5, 2.5, 4.83],
        border: { pt: 1, color: C.rule },
        fill: { color: C.bone },
      }
    )
  } else {
    s4.addText("Конкуренты не обнаружены в AI-ответах.", {
      x: 0.5, y: 2.5, w: 12.33, h: 0.5,
      fontFace: SANS, fontSize: 14, color: C.ink3, align: "center",
    })
  }

  footer(s4)

  // ── Slide 5: Action Plan ──────────────────────────────────────────────────

  const s5 = prs.addSlide()
  addBg(s5)

  eyebrow(s5, "— ПЛАН РОСТА", 0.5, 0.3)
  heading(s5, "Action Plan: 30 / 60 / 90 дней", 0.5, 0.65)
  divider(s5, 1.5)

  if (data.actionPlan.strategy) {
    s5.addText(data.actionPlan.strategy.slice(0, 200), {
      x: 0.5, y: 1.6, w: 12.33, h: 0.5,
      fontFace: SANS, fontSize: 11, color: C.ink2, italic: true,
    })
  }

  const cols = [
    { label: "30 ДНЕЙ", items: data.actionPlan["30d"] ?? [], x: 0.5 },
    { label: "60 ДНЕЙ", items: data.actionPlan["60d"] ?? [], x: 4.61 },
    { label: "90 ДНЕЙ", items: data.actionPlan["90d"] ?? [], x: 8.72 },
  ]

  const colW = 3.9
  const startY = data.actionPlan.strategy ? 2.25 : 1.7

  cols.forEach((col) => {
    // Column header
    s5.addShape(prs.ShapeType.rect, {
      x: col.x, y: startY, w: colW, h: 0.3,
      fill: { color: C.lime },
      line: { color: C.lime, width: 0 },
    })
    s5.addText(col.label, {
      x: col.x + 0.1, y: startY + 0.04, w: colW - 0.2, h: 0.22,
      fontFace: MONO, fontSize: 9, bold: true, color: C.ink, charSpacing: 1,
    })

    // Items
    col.items.slice(0, 4).forEach((item, i) => {
      const iy = startY + 0.4 + i * 1.15
      s5.addShape(prs.ShapeType.rect, {
        x: col.x, y: iy, w: colW, h: 1.05,
        fill: { color: C.bone2 },
        line: { color: C.rule, width: 1 },
        rectRadius: 0.06,
      })
      s5.addText(item.title, {
        x: col.x + 0.15, y: iy + 0.1, w: colW - 0.3, h: 0.35,
        fontFace: SANS, fontSize: 10, bold: true, color: C.ink,
      })
      s5.addText((item.description ?? "").slice(0, 100), {
        x: col.x + 0.15, y: iy + 0.42, w: colW - 0.3, h: 0.55,
        fontFace: SANS, fontSize: 8.5, color: C.ink3,
      })
    })
  })

  footer(s5)

  // ── Slide 6: Next Steps ───────────────────────────────────────────────────

  const s6 = prs.addSlide()
  addBg(s6)

  // Full lime top bar
  s6.addShape(prs.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 0.06,
    fill: { color: C.lime },
    line: { color: C.lime, width: 0 },
  })

  s6.addText("Следующие шаги", {
    x: 0.5, y: 1.5, w: 12.33, h: 0.8,
    fontFace: SERIF, fontSize: 36, color: C.ink, align: "center",
  })

  const steps = [
    "Внедрите рекомендации Action Plan — начните с 30-дневного блока",
    "Запустите повторный аудит через месяц — отслеживайте динамику",
    "Подключите мониторинг-тариф для автоматических алёртов при падении",
  ]
  steps.forEach((step, i) => {
    s6.addText(`${i + 1}. ${step}`, {
      x: 1.5, y: 2.6 + i * 0.65, w: 10.33, h: 0.5,
      fontFace: SANS, fontSize: 14, color: C.ink2,
    })
  })

  s6.addText("kaligeo.ru", {
    x: 0.5, y: 5.5, w: 12.33, h: 0.5,
    fontFace: MONO, fontSize: 22, bold: true, color: C.ink, align: "center",
  })

  s6.addText("AI Search Visibility Audit — для брендов, которые хотят попасть в ответы ИИ", {
    x: 0.5, y: 6.1, w: 12.33, h: 0.4,
    fontFace: SANS, fontSize: 11, color: C.ink3, align: "center",
  })

  footer(s6)

  // ── Export ────────────────────────────────────────────────────────────────

  const buffer = await prs.write({ outputType: "nodebuffer" }) as Buffer
  return buffer
}
