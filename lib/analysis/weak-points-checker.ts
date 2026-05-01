import type { QueryResult } from "@prisma/client"

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
  overallScore: number
): WeakPoint[] {
  const mentionedInSources = results.filter((r) => {
    const sources = r.sources as string[]
    return sources.some((s) => s.includes(websiteUrl.replace("https://", "").replace("http://", "").split("/")[0]))
  }).length

  const brandMentionRate = results.filter((r) => r.brandMentioned).length / Math.max(results.length, 1)
  const negativeSentiments = results.filter((r) => r.sentiment === "negative").length

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
      detected: true, // always flag — checked during implementation review
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
  ] as const).map(wp => ({ ...wp, severity: wp.severity as WeakPoint["severity"] })).filter((wp) => wp.detected)
}
