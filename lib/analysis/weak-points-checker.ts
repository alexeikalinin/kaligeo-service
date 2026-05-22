import type { QueryResult } from "@prisma/client"
import { calculateShareOfVoice } from "./share-of-voice"
import { calculateCompetitivePosition } from "./competitive-positioning"

export interface WeakPoint {
  id: string
  title: string
  description: string
  severity: "high" | "medium" | "low"
  detected: boolean
}

export function detectWeakPoints(
  results: QueryResult[],
  websiteUrl: string,
  overallScore: number,
  competitors?: string[]
): WeakPoint[] {
  const domain = websiteUrl.replace("https://", "").replace("http://", "").split("/")[0]

  // SoV и позиционирование (если есть конкуренты)
  const compList = competitors ?? []
  const sov = compList.length > 0 ? calculateShareOfVoice(results, "", compList) : null
  const positioning = compList.length >= 2 ? calculateCompetitivePosition(results, compList) : null

  const mentionedInSources = results.filter((r) => {
    const sources = r.sources as string[]
    return sources.some((s) => s.includes(domain))
  }).length

  const brandMentionRate = results.filter((r) => r.brandMentioned).length / Math.max(results.length, 1)
  const negativeSentiments = results.filter((r) => r.sentiment === "negative").length

  // Позиционные запросы: "топ", "лучший", "первый", "рейтинг", "рекомендуй" — ключевые для GEO Authority
  const positionQueries = results.filter((r) =>
    /топ|лучш|первый|рейтинг|рекоменд|best|top|leader|recommend/i.test(r.query)
  )
  const mentionedInPositionQueries = positionQueries.filter((r) => r.brandMentioned).length
  const positionMentionRate = positionQueries.length > 0
    ? mentionedInPositionQueries / positionQueries.length
    : brandMentionRate

  // Сравнительные запросы: "vs", "или", "сравн", "лучше" — важны для Comparison-страниц
  const comparisonQueries = results.filter((r) =>
    /\bvs\b|или|сравн|лучше|против|compare|versus/i.test(r.query)
  )
  const mentionedInComparisonQueries = comparisonQueries.filter((r) => r.brandMentioned).length
  const comparisonMentionRate = comparisonQueries.length > 0
    ? mentionedInComparisonQueries / comparisonQueries.length
    : 1 // нет comparison-запросов — не флагируем

  // positionScore из схемы (Фаза 3) — если есть данные, используем
  type ResultWithPos = QueryResult & { positionScore: number }
  const positionScores = results
    .filter((r) => r.brandMentioned && (r as ResultWithPos).positionScore > 0)
    .map((r) => (r as ResultWithPos).positionScore)
  const avgPositionScore = positionScores.length > 0
    ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
    : 0
  const hasPositionData = positionScores.length >= 3

  return ([
    {
      id: "low-visibility",
      title: "Низкая AI-видимость",
      description: `Бренд упоминается только в ${Math.round(brandMentionRate * 100)}% ответов. Целевой показатель — 40%+`,
      severity: "high",
      detected: brandMentionRate < 0.2,
    },
    {
      id: "no-source-citations",
      title: "Отсутствие ссылок на сайт",
      description: "AI-поисковики не цитируют ваш сайт как источник. Нужны авторитетные материалы и Schema разметка.",
      severity: "high",
      detected: mentionedInSources < 3,
    },
    // GEO 2026: Position gap — не попадает в топ-рекомендации
    {
      id: "not-first-in-recommendations",
      title: "Не попадает в топ-рекомендации",
      description: `В запросах "топ", "лучший", "рейтинг" бренд упоминается только в ${Math.round(positionMentionRate * 100)}% случаев. ИИ не считает вас primary recommendation. Нужны GEO Authority сигналы и контент формата "Лучший X для Y".`,
      severity: "high",
      detected: positionQueries.length >= 3 && positionMentionRate < 0.25,
    },
    {
      id: "negative-sentiment",
      title: "Негативные упоминания",
      description: `Обнаружено ${negativeSentiments} ответов с негативным контекстом. Проверьте отзывы и репутацию.`,
      severity: "medium",
      detected: negativeSentiments > 0,
    },
    {
      id: "low-score",
      title: "Общий низкий рейтинг видимости",
      description: `Общий score ${overallScore}/100. Требуется комплексная работа с AI-присутствием.`,
      severity: "medium",
      detected: overallScore < 30,
    },
    {
      id: "missing-schema",
      title: "Отсутствие Schema.org разметки",
      description: "Без структурированных данных AI сложнее идентифицировать ваш бизнес как авторитетный источник.",
      severity: "medium",
      detected: true, // always flag — проверяется при реализации
    },
    // GEO 2026: Position score — упоминается поздно в ответе
    {
      id: "low-position-score",
      title: "Слабая позиция в ответе",
      description: `Бренд упоминается преимущественно в середине или конце AI-ответов (средняя позиция ${avgPositionScore.toFixed(1)}/4). Первое упоминание получает в 3-5x больше внимания. Нужен контент, который ИИ использует как primary source.`,
      severity: "medium",
      detected: hasPositionData && avgPositionScore > 2.5,
    },
    // GEO 2026: Comparison gap — не включают в сравнения
    {
      id: "missing-comparison-presence",
      title: "Отсутствие в сравнительных запросах",
      description: `В запросах "X vs Y" и "сравнение [ниша]" бренд упоминается в ${Math.round(comparisonMentionRate * 100)}% случаев. ИИ не включает вас в сравнения конкурентов — нужны Comparison-страницы и присутствие в отраслевых рейтингах.`,
      severity: "medium",
      detected: comparisonQueries.length >= 2 && comparisonMentionRate < 0.3,
    },
    {
      id: "few-reviews",
      title: "Недостаточно отзывов",
      description: "Отзывы на Google, Яндекс, 2GIS напрямую влияют на то, рекомендует ли AI ваш бизнес.",
      severity: "low",
      detected: overallScore < 50,
    },
    {
      id: "entity-signals",
      title: "Слабые entity signals",
      description: "Ваш бренд плохо представлен в Wikipedia, Wikidata или отраслевых справочниках, которые AI использует как источник.",
      severity: "low",
      detected: brandMentionRate < 0.15,
    },
    // ── SoV & Positioning ─────────────────────────────────────────────────────
    {
      id: "sov-below-20",
      title: "Проигрываете конкурентам по доле упоминаний",
      description: `Share of Voice бренда: ${sov?.overall ?? 0}%. Конкуренты упоминаются в AI-ответах чаще. Увеличьте контентное присутствие и авторитет источников.`,
      severity: "high",
      detected: sov !== null && sov.overall < 20,
    },
    {
      id: "not-ranked-first",
      title: "Редко упоминаетесь первым",
      description: `Первое место в ответе AI получаете только в ${positioning?.firstMentionRate ?? 0}% запросов. Первое упоминание получает в 3–5× больше внимания — нужен контент формата primary recommendation.`,
      severity: "medium",
      detected: positioning !== null && positioning.firstMentionRate < 30,
    },
    {
      id: "competitive-position-weak",
      title: "Слабые конкурентные позиции",
      description: `По частоте упоминаний в AI вы занимаете ${positioning?.rank ?? "?"} место из ${positioning?.totalParticipants ?? "?"}. Конкуренты системно опережают вас в ответах нейросетей.`,
      severity: "high",
      detected: positioning !== null && positioning.rank > 2 && positioning.totalParticipants >= 3,
    },
  ] as const).map(wp => ({ ...wp, severity: wp.severity as WeakPoint["severity"] })).filter((wp) => wp.detected)
}
