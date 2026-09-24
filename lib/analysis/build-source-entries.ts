import type { SourcesReport } from "./aggregate-sources"
import type { SourceEntry } from "@/components/report/SourceAuthority"

const ENTRY_TYPES: SourceEntry["type"][] = ["catalog", "media", "expert", "social", "official"]

/**
 * Строит SourceEntry[] (вкладка «Конкуренты» → SourceAuthority) из уже
 * посчитанного и сохранённого sourcesReport — без новых запросов к LLM.
 * "competitor" и "other" домены исключены — компонент показывает только
 * сторонние источники авторитетности, не сайты конкурентов.
 */
export function buildSourceEntries(sourcesReport: SourcesReport): SourceEntry[] {
  return sourcesReport.topDomains
    .filter((d): d is typeof d & { category: SourceEntry["type"] } =>
      (ENTRY_TYPES as string[]).includes(d.category)
    )
    .map((d) => ({
      domain: d.domain,
      url: d.urls[0],
      mentionCount: d.count,
      type: d.category,
      competitors: sourcesReport.competitorSourceAdvantage
        .filter((c) => c.uniqueDomains.includes(d.domain))
        .map((c) => c.competitor),
    }))
}
