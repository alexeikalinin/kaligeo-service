/**
 * Source Quality Scoring — Волна 2
 * Оценивает авторитетность и трастовость источников, которые AI цитирует.
 */

// ── Authority map: base score 0–100 per domain pattern ───────────────────────
const AUTHORITY_MAP: Record<string, number> = {
  // Энциклопедии / справочники
  "wikipedia.org": 95,
  "wikimedia.org": 90,
  "wikidata.org": 90,

  // Крупные российские/СНГ-СМИ
  "rbc.ru": 87,
  "vedomosti.ru": 87,
  "kommersant.ru": 86,
  "forbes.ru": 85,
  "tass.ru": 84,
  "ria.ru": 82,
  "interfax.ru": 82,
  "gazeta.ru": 78,
  "iz.ru": 78,
  "fontanka.ru": 75,

  // IT/Tech медиа
  "vc.ru": 78,
  "habr.com": 82,
  "cnews.ru": 76,
  "3dnews.ru": 72,
  "tproger.ru": 70,
  "rusbase.com": 72,
  "rb.ru": 70,
  "inc.ru": 70,
  "secretmag.ru": 68,
  "sostav.ru": 72,
  "cossa.ru": 70,
  "adindex.ru": 68,
  "searchengines.ru": 70,
  "seonews.ru": 68,
  "texterra.ru": 65,

  // Глобальные медиа
  "techcrunch.com": 88,
  "wired.com": 86,
  "theverge.com": 85,
  "bloomberg.com": 90,
  "reuters.com": 90,
  "bbc.com": 90,
  "bbc.co.uk": 90,
  "nytimes.com": 90,

  // Каталоги и отзовики
  "2gis.ru": 72,
  "yell.ru": 65,
  "flamp.ru": 65,
  "zoon.ru": 62,
  "otzovik.com": 65,
  "irecommend.ru": 63,
  "tripadvisor.com": 75,
  "prodoctorov.ru": 68,
  "spr.ru": 58,

  // Банки/финансы
  "tinkoff.ru": 78,
  "sberbank.ru": 75,
  "alfabank.ru": 74,

  // Соцсети
  "vk.com": 45,
  "youtube.com": 55,
  "t.me": 42,
  "dzen.ru": 50,
  "ok.ru": 38,
}

/** Определяет authority score домена (0–100) по таблице или эвристике */
export function getDomainAuthority(hostname: string): number {
  const h = hostname.replace("www.", "").toLowerCase()

  // Прямое совпадение
  if (AUTHORITY_MAP[h] !== undefined) return AUTHORITY_MAP[h]

  // Суффиксный поиск (например, news.vc.ru → vc.ru = 78)
  for (const [pattern, score] of Object.entries(AUTHORITY_MAP)) {
    if (h.endsWith(`.${pattern}`) || h === pattern) return score
  }

  // Эвристика по TLD и длине домена
  if (h.endsWith(".gov") || h.endsWith(".gov.ru")) return 85
  if (h.endsWith(".edu") || h.endsWith(".edu.ru")) return 80
  if (h.endsWith(".org")) return 62

  // Длина домена как прокси для авторитетности: короткий = более известный
  const parts = h.split(".")
  const mainPart = parts[parts.length - 2] ?? ""
  if (mainPart.length <= 4) return 60   // короткие домены чаще крупные
  if (mainPart.length <= 8) return 52
  return 42
}

export interface SourceQualityEntry {
  domain: string
  url: string
  authority: number    // 0–100: авторитетность домена
  trustIndex: number   // итоговый трастовый скор (округлён)
}

/** Рассчитывает quality score для списка URL-источников */
export function scoreSourceQuality(urls: string[]): SourceQualityEntry[] {
  const results: SourceQualityEntry[] = []

  for (const url of urls) {
    try {
      const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`)
      const hostname = urlObj.hostname.replace("www.", "").toLowerCase()
      const authority = getDomainAuthority(hostname)
      // trustIndex = authority (можно расширить freshness/relevance в будущем)
      const trustIndex = Math.round(authority)

      results.push({ domain: hostname, url, authority, trustIndex })
    } catch {
      // skip malformed
    }
  }

  return results
}

/** Средний trust index для набора URL (0–100) */
export function averageSourceTrust(urls: string[]): number {
  if (urls.length === 0) return 0
  const entries = scoreSourceQuality(urls)
  if (entries.length === 0) return 0
  return Math.round(entries.reduce((s, e) => s + e.trustIndex, 0) / entries.length)
}

/** Топ-N наиболее трастовых источников */
export function topTrustedSources(urls: string[], n = 5): SourceQualityEntry[] {
  return scoreSourceQuality(urls).sort((a, b) => b.trustIndex - a.trustIndex).slice(0, n)
}
