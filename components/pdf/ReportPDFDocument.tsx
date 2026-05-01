import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"

interface PlatformScore {
  platform: string
  score: number
  citationRate: number
  totalQueries: number
  mentionCount: number
  positiveCount: number
}

interface CompetitorEntry {
  name: string
  platforms: string[]
  mentionCount: number
}

interface WeakPoint {
  id: string
  title: string
  description: string
  severity: "low" | "medium" | "high"
  detected: boolean
}

interface ActionItem {
  title: string
  description: string
  effort: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
}

interface ActionPlan {
  "30d": ActionItem[]
  "60d": ActionItem[]
  "90d": ActionItem[]
}

interface ReportData {
  companyName: string
  websiteUrl: string
  niche: string
  tier: string
  overallScore: number
  createdAt: string | Date
  visibilityScores: Record<string, PlatformScore>
  competitorMatrix: CompetitorEntry[]
  weakPoints: WeakPoint[]
  actionPlan: ActionPlan
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontSize: 10,
    color: "#1a1a1a",
  },
  coverPage: {
    fontFamily: "Helvetica",
    backgroundColor: "#0f172a",
    paddingTop: 80,
    paddingBottom: 80,
    paddingHorizontal: 64,
    color: "#ffffff",
  },
  brand: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#94a3b8", letterSpacing: 2 },
  coverTitle: { fontSize: 32, fontFamily: "Helvetica-Bold", color: "#ffffff", marginTop: 48 },
  coverSubtitle: { fontSize: 14, color: "#94a3b8", marginTop: 8 },
  scoreCircle: {
    marginTop: 48,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBig: { fontSize: 48, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  scoreLabel: { fontSize: 11, color: "#94a3b8", marginTop: 4 },
  coverMeta: { marginTop: 48, color: "#64748b", fontSize: 10 },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  row: { flexDirection: "row", gap: 12, marginBottom: 10 },
  card: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitle: { fontSize: 9, color: "#64748b", marginBottom: 4 },
  cardValue: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#0f172a" },
  cardSub: { fontSize: 8, color: "#94a3b8", marginTop: 2 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableCell: { flex: 1, fontSize: 9, color: "#374151" },
  tableCellBold: { flex: 1, fontSize: 9, fontFamily: "Helvetica-Bold", color: "#111827" },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 8,
    marginRight: 4,
  },
  weakPointItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#fef9f0",
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
  },
  weakPointHigh: { borderLeftColor: "#ef4444", backgroundColor: "#fff5f5" },
  weakPointLow: { borderLeftColor: "#22c55e", backgroundColor: "#f0fdf4" },
  weakTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginBottom: 3 },
  weakDesc: { fontSize: 9, color: "#6b7280", lineHeight: 1.4 },
  planCol: { flex: 1, marginRight: 8 },
  planHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  planItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  planTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginBottom: 3 },
  planDesc: { fontSize: 8, color: "#6b7280", lineHeight: 1.4 },
  planMeta: { fontSize: 7, color: "#94a3b8", marginTop: 3 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#94a3b8",
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
})

function scoreColor(score: number) {
  if (score >= 60) return "#22c55e"
  if (score >= 30) return "#f59e0b"
  return "#ef4444"
}

function CoverPage({ data }: { data: ReportData }) {
  const date = new Date(data.createdAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.brand}>KALIGEO</Text>
      <Text style={styles.coverTitle}>{data.companyName}</Text>
      <Text style={styles.coverSubtitle}>AI Search Visibility Audit</Text>
      <View style={styles.scoreCircle}>
        <Text style={[styles.scoreBig, { color: scoreColor(data.overallScore) }]}>
          {data.overallScore}
        </Text>
        <Text style={styles.scoreLabel}>/ 100</Text>
      </View>
      <Text style={[styles.coverMeta, { marginTop: 24 }]}>Ниша: {data.niche}</Text>
      <Text style={styles.coverMeta}>Сайт: {data.websiteUrl}</Text>
      <Text style={styles.coverMeta}>Тариф: {data.tier}</Text>
      <Text style={[styles.coverMeta, { marginTop: 24 }]}>{date}</Text>
    </Page>
  )
}

function PlatformScoresPage({ data }: { data: ReportData }) {
  const scores = Object.values(data.visibilityScores)
  const rows: PlatformScore[][] = []
  for (let i = 0; i < scores.length; i += 2) rows.push(scores.slice(i, i + 2))

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Видимость по платформам</Text>
      {rows.map((pair, i) => (
        <View key={i} style={styles.row}>
          {pair.map((s) => (
            <View key={s.platform} style={styles.card}>
              <Text style={styles.cardTitle}>{s.platform}</Text>
              <Text style={[styles.cardValue, { color: scoreColor(s.score) }]}>{s.score}</Text>
              <Text style={styles.cardSub}>Citation rate: {s.citationRate}%</Text>
              <Text style={styles.cardSub}>
                Упоминаний: {s.mentionCount} / {s.totalQueries} запросов
              </Text>
              <Text style={styles.cardSub}>Позитивных: {s.positiveCount}</Text>
            </View>
          ))}
          {pair.length === 1 && <View style={styles.card} />}
        </View>
      ))}
      <View style={styles.footer}>
        <Text>KaliGEO AI Audit</Text>
        <Text>{data.companyName}</Text>
      </View>
    </Page>
  )
}

function CompetitorMatrixPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Матрица конкурентов</Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableCellBold, { flex: 2 }]}>Конкурент</Text>
        <Text style={styles.tableCellBold}>Упоминаний</Text>
        <Text style={[styles.tableCellBold, { flex: 2 }]}>Платформы</Text>
      </View>
      {data.competitorMatrix.map((c, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.tableCell, { flex: 2 }]}>{c.name}</Text>
          <Text style={styles.tableCell}>{c.mentionCount}</Text>
          <Text style={[styles.tableCell, { flex: 2 }]}>{c.platforms.join(", ")}</Text>
        </View>
      ))}
      <View style={styles.footer}>
        <Text>KaliGEO AI Audit</Text>
        <Text>{data.companyName}</Text>
      </View>
    </Page>
  )
}

function WeakPointsPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>Слабые места</Text>
      {data.weakPoints
        .filter((w) => w.detected)
        .map((w) => (
          <View
            key={w.id}
            style={[
              styles.weakPointItem,
              ...(w.severity === "high" ? [styles.weakPointHigh] : []),
              ...(w.severity === "low" ? [styles.weakPointLow] : []),
            ]}
          >
            <Text style={styles.weakTitle}>
              {w.severity === "high" ? "⚠ " : w.severity === "low" ? "✓ " : "• "}
              {w.title}
            </Text>
            <Text style={styles.weakDesc}>{w.description}</Text>
          </View>
        ))}
      <View style={styles.footer}>
        <Text>KaliGEO AI Audit</Text>
        <Text>{data.companyName}</Text>
      </View>
    </Page>
  )
}

function ActionPlanPage({ data }: { data: ReportData }) {
  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>План роста видимости</Text>
      <View style={styles.row}>
        {(["30d", "60d", "90d"] as const).map((period) => (
          <View key={period} style={styles.planCol}>
            <Text style={styles.planHeader}>
              {period === "30d" ? "30 дней" : period === "60d" ? "60 дней" : "90 дней"}
            </Text>
            {data.actionPlan[period].map((item, i) => (
              <View key={i} style={styles.planItem}>
                <Text style={styles.planTitle}>{item.title}</Text>
                <Text style={styles.planDesc}>{item.description}</Text>
                <Text style={styles.planMeta}>
                  Усилия: {item.effort} · Эффект: {item.impact}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
      <View style={styles.footer}>
        <Text>KaliGEO AI Audit</Text>
        <Text>{data.companyName}</Text>
      </View>
    </Page>
  )
}

export function ReportPDFDocument({ data }: { data: ReportData }) {
  return (
    <Document title={`KaliGEO Audit — ${data.companyName}`} author="KaliGEO">
      <CoverPage data={data} />
      <PlatformScoresPage data={data} />
      {data.competitorMatrix.length > 0 && <CompetitorMatrixPage data={data} />}
      {data.weakPoints.some((w) => w.detected) && <WeakPointsPage data={data} />}
      <ActionPlanPage data={data} />
    </Document>
  )
}
