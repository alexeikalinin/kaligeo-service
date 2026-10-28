import type { SiteEvidence } from "./site-evidence"
import type { QueryResult } from "@prisma/client"
import { calculateShareOfVoice } from "./share-of-voice"
import { calculateCompetitivePosition } from "./competitive-positioning"
import type { PlatformScore } from "./calculate-scores"

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
  competitors?: string[],
  platformScores?: Record<string, PlatformScore>,
  evidence?: SiteEvidence
): WeakPoint[] {
  const domain = websiteUrl.replace("https://", "").replace("http://", "").split("/")[0]

  // SoV и позиционирование (если есть конкуренты)
  const compList = competitors ?? []
  const sov = compList.length > 0 ? calculateShareOfVoice(results, "", compList) : null
  const positioning = compList.length >= 2 ? calculateCompetitivePosition(results, compList) : null

  const mentionedInSources = results.filter((r) => {
    const sources = r.sources as string[]
    return sources.some((s) => {
      try { const host = new URL(s).hostname.replace(/^www\./, ""); const target = domain.replace(/^www\./, ""); return host === target || host.endsWith(`.${target}`) } catch { return false }
    })
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
      description: `Бренд упоминается только в ${Math.round(brandMentionRate * 100)}% ответов в проверенной выборке.`,
      severity: "high",
      detected: brandMentionRate < 0.2,
    },
    {
      id: "no-source-citations",
      title: "Редкие ссылки на сайт в выборке",
      description: `Ссылки на сайт найдены в ${mentionedInSources} из ${results.length} ответов. Причины отсутствия ссылок не установлены; режим поиска и доступность цитирования различаются между моделями.`,
      severity: "high",
      detected: mentionedInSources < 3,
    },
    // GEO 2026: Position gap — не попадает в топ-рекомендации
    {
      id: "not-first-in-recommendations",
      title: "Не попадает в топ-рекомендации",
      description: `В запросах "топ", "лучший", "рейтинг" бренд упоминается только в ${Math.round(positionMentionRate * 100)}% случаев. Это наблюдение по данной выборке, а не доказательство причины низкой видимости.`,
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
      title: "На проверенных страницах не найдена Schema.org разметка",
      description: `Проверено ${evidence?.checkedAt ?? ""}: ${evidence?.pages.map(p => p.url).join(", ") ?? ""}. Разметка не обнаружена в полученном HTML; разметка, добавляемая JavaScript, не проверена.`,
      severity: "medium",
      detected: !!evidence?.pages.length && evidence.pages.every(p => !p.schemaFound),
    },
    // GEO 2026: Position score — упоминается поздно в ответе
    {
      id: "low-position-score",
      title: "Слабая позиция в ответе",
      description: `Бренд упоминается преимущественно в середине или конце AI-ответов (средняя позиция ${avgPositionScore.toFixed(1)}/4). Позиция измерена в сохранённых ответах; влияние на внимание пользователей не измерялось.`,
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
    // ── Покрытие типов запросов (фреймворк 5 типов) ───────────────────────────
    ...((): WeakPoint[] => {
      if (results.length < 5) return []

      // Категорийные: "лучший", "топ", "рейтинг", "рекоменд"
      const categoryQ = results.filter((r) => /лучш|топ|рейтинг|рекоменд|best|top|leader/i.test(r.query))
      // Коммерческие: "цена", "стоимость", "купить", "заказать", "тариф"
      const commercialQ = results.filter((r) => /цен|стоимость|купить|заказать|тариф|сколько стоит|price|buy|order/i.test(r.query))
      // Проблемные: "как", "почему", "что делать", "помогите", "решение"
      const problemQ = results.filter((r) => /^как |почему|что делать|помогите|решени|проблем|how to|why /i.test(r.query))
      // Сравнительные: уже есть comparisonQueries выше
      // Брендовые: содержат название домена или компании

      const missedTypes: string[] = []
      if (categoryQ.length === 0) missedTypes.push("категорийные («лучший X», «топ сервисов»)")
      if (commercialQ.length === 0) missedTypes.push("коммерческие («цена», «заказать»)")
      if (problemQ.length === 0) missedTypes.push("проблемные («как сделать X», «решение проблемы»)")

      if (missedTypes.length === 0) return []
      const coverageWp: WeakPoint = {
        id: "query-type-coverage-gap",
        title: "Не все типы запросов охвачены",
        description: `В аудите не проверялись: ${missedTypes.join(", ")}. Профессиональный GEO-аудит охватывает 5 типов: категорийные, коммерческие, проблемные, сравнительные и брендовые. AI-видимость может сильно отличаться по каждому типу.`,
        severity: "low",
        detected: true,
      }
      return [coverageWp]
    })(),

    // ── Entity Recognition по платформам ──────────────────────────────────────
    ...((): WeakPoint[] => {
      if (!platformScores) return []
      const wps: WeakPoint[] = []

      for (const [platform, ps] of Object.entries(platformScores)) {
        // Пропускаем платформы с малым числом запросов
        if (ps.totalQueries < 3) continue

        const platformMentionRate = ps.mentionCount / Math.max(ps.totalQueries, 1)
        const platformResults = results.filter(
          (r) => r.platform === platform || r.platform === platform.toUpperCase() || r.platform === platform.toLowerCase()
        )
        const hasNegativeSentiment = platformResults.some((r) => r.sentiment === "negative")
        const platformLabel = platform

        if (platformMentionRate === 0) {
          wps.push({
            id: `entity-unrecognized-${platform.toLowerCase()}`,
            title: `${platformLabel}: нет упоминаний в выборке`,
            description: `${platformLabel} не упомянул бренд в ${ps.totalQueries} проверенных вопросах. Это не доказывает, что модель не знает компанию. Для оценки знания бренда нужны отдельные прямые вопросы.`,
            severity: "high",
            detected: true,
          })
        } else if (platformMentionRate > 0 && platformMentionRate < 0.1) {
          wps.push({
            id: `entity-partial-${platform.toLowerCase()}`,
            title: `${platformLabel}: редкие упоминания в выборке`,
            description: `${platformLabel} упоминает бренд только в ${Math.round(platformMentionRate * 100)}% запросов в этой выборке. Причины требуют отдельной проверки.`,
            severity: "medium",
            detected: true,
          })
        } else if (hasNegativeSentiment && platformMentionRate > 0.3) {
          wps.push({
            id: `entity-confused-${platform.toLowerCase()}`,
            title: `${platformLabel}: неверный контекст упоминания`,
            description: `${platformLabel} упоминает бренд с негативным контекстом — возможно, путает с другой компанией или воспроизводит устаревшую информацию. Добавьте disambiguation-блок на сайте: «[Бренд] (не путать с [похожее]) — это...».`,
            severity: "high",
            detected: true,
          })
        }
      }

      return wps
    })(),

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
      description: `Первое место в ответе AI получаете только в ${positioning?.firstMentionRate ?? 0}% запросов. Влияние позиции на действия пользователей в этом аудите не измерялось.`,
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
