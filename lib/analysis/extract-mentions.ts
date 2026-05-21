// ──────────────────────────────────────────────────────────────────────────────
// Source domain categories used for RAG Source Attribution
// ──────────────────────────────────────────────────────────────────────────────

export type SourceCategory =
  | "official"    // сайт самого клиента
  | "catalog"     // каталоги и отзовики: irecommend, otzovik, 2gis, yell
  | "media"       // СМИ и крупные порталы: vc.ru, habr, rbc, wikipedia
  | "expert"      // профильные блоги, отраслевые ресурсы
  | "social"      // соцсети: vk, youtube, telegram
  | "competitor"  // домены конкурентов
  | "other"

const CATALOG_PATTERNS = [
  "irecommend", "otzovik", "zoon", "yell.", "flamp", "2gis", "yandex.ru/maps",
  "maps.google", "google.com/maps", "tripadvisor", "restoran.ru", "prodoctorov",
  "spr.ru", "zubry.ru", "vseobuilding", "blizko.ru",
]

const MEDIA_PATTERNS = [
  "wikipedia.org", "wikimedia", "vc.ru", "habr.com", "rbc.ru", "vedomosti.ru",
  "kommersant.ru", "forbes.ru", "rusbase.com", "rb.ru", "tinkoff.ru/journal",
  "inc.ru", "secretmag.ru", "cnews.ru", "cnews", "3dnews.ru", "sostav.ru",
  "adindex.ru", "cossa.ru", "seonews.ru", "searchengines.ru", "texterra.ru",
]

const SOCIAL_PATTERNS = [
  "vk.com", "vkontakte.ru", "youtube.com", "youtu.be", "t.me", "telegram.me",
  "instagram.com", "tiktok.com", "dzen.ru", "ok.ru",
]

export function categorizeDomain(url: string, websiteUrl: string, competitors: string[]): SourceCategory {
  try {
    const urlObj = new URL(url.startsWith("http") ? url : `https://${url}`)
    const hostname = urlObj.hostname.replace("www.", "").toLowerCase()
    const clientDomain = websiteUrl.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "").toLowerCase()

    if (hostname === clientDomain || hostname.endsWith(`.${clientDomain}`)) return "official"

    for (const comp of competitors) {
      const compDomain = comp.toLowerCase().replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
      if (compDomain.length > 3 && (hostname.includes(compDomain) || compDomain.includes(hostname.split(".")[0]))) {
        return "competitor"
      }
    }

    if (CATALOG_PATTERNS.some((p) => hostname.includes(p) || url.toLowerCase().includes(p))) return "catalog"
    if (MEDIA_PATTERNS.some((p) => hostname.includes(p) || url.toLowerCase().includes(p))) return "media"
    if (SOCIAL_PATTERNS.some((p) => hostname.includes(p))) return "social"

    return "expert"
  } catch {
    return "other"
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Position-in-answer detection
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Определяет позицию бренда в ответе ИИ.
 * 0 = absent (не упомянут)
 * 1 = first  (первый в нумерованном/маркированном списке, или первые 15% ответа)
 * 2 = early  (первые 33% ответа)
 * 3 = middle (33–67%)
 * 4 = late   (67–100%)
 */
export function detectPositionScore(response: string, brandName: string): number {
  const lower = response.toLowerCase()
  const brand = brandName.toLowerCase()
  const idx = lower.indexOf(brand)
  if (idx === -1) return 0

  const len = response.length
  const relativePos = idx / len

  // Проверяем, является ли первым пунктом списка (1. Brand, - Brand, * Brand, **Brand**)
  const beforeBrand = response.slice(Math.max(0, idx - 20), idx)
  const isFirstListItem = /^\s*(?:1[.)]\s*|\*\*|\*\s|-\s|•\s)$/.test(beforeBrand.trimEnd())
    || /\n\s*1[.)]\s*/.test(response.slice(0, idx + brand.length))

  if (isFirstListItem || relativePos < 0.15) return 1
  if (relativePos < 0.33) return 2
  if (relativePos < 0.67) return 3
  return 4
}

// ──────────────────────────────────────────────────────────────────────────────
// Main extraction function
// ──────────────────────────────────────────────────────────────────────────────

export interface MentionResult {
  brandMentioned: boolean
  competitors: string[]
  sources: string[]
  sentiment: "positive" | "neutral" | "negative" | "absent"
  positionScore: number
  sourceCategories: Record<SourceCategory, string[]>
}

/**
 * @param citationsFromApi — структурированные citations от платформы (Perplexity).
 *   Если переданы, используются как основа source списка (приоритет над regex).
 */
export function extractMentions(
  response: string,
  companyName: string,
  websiteUrl: string,
  competitors: string[],
  citationsFromApi?: string[]
): MentionResult {
  const lower = response.toLowerCase()
  const domain = (() => {
    try {
      return new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname
        .replace("www.", "").toLowerCase()
    } catch {
      return websiteUrl.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "").toLowerCase()
    }
  })()

  const brandMentioned =
    lower.includes(companyName.toLowerCase()) || lower.includes(domain)

  const foundCompetitors = competitors.filter((c) => lower.includes(c.toLowerCase()))

  // Sources: приоритет у структурированных citations (Perplexity), иначе — улучшенный regex
  const regexUrls: string[] = []
  // Улучшенный regex: исключает URL с trailing punctuation и markdown artifacts
  const urlRegex = /https?:\/\/[a-zA-Z0-9](?:[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%])*[a-zA-Z0-9/]/g
  const matched = response.match(urlRegex) ?? []
  for (const url of matched) {
    // Фильтруем технические URL (шрифты, CDN, изображения)
    if (!/\.(woff|woff2|ttf|eot|png|jpg|jpeg|gif|svg|css|js|ico)(\?|$)/i.test(url)) {
      regexUrls.push(url)
    }
  }

  const sources = [...new Set(citationsFromApi && citationsFromApi.length > 0 ? citationsFromApi : regexUrls)]

  // Категоризация источников
  const sourceCategories: Record<SourceCategory, string[]> = {
    official: [],
    catalog: [],
    media: [],
    expert: [],
    social: [],
    competitor: [],
    other: [],
  }
  for (const url of sources) {
    const cat = categorizeDomain(url, websiteUrl, competitors)
    sourceCategories[cat].push(url)
  }

  // Позиция бренда в ответе
  const positionScore = brandMentioned ? detectPositionScore(response, companyName) : 0

  // Тональность
  let sentiment: MentionResult["sentiment"] = "absent"
  if (brandMentioned) {
    const positiveWords = [
      "recommend", "best", "excellent", "top", "great", "leading", "trusted", "popular", "award",
      "рекомендуем", "лучший", "отличный", "лидер", "надёжный", "топ", "доверяем", "популярный",
      "советуем", "выбирают", "предпочитают", "первый", "№1",
    ]
    const negativeWords = [
      "avoid", "poor", "bad", "worst", "scam", "unreliable", "expensive", "slow",
      "не рекомендуем", "плохой", "мошенник", "ненадёжный", "дорогой", "медленный",
      "жалоба", "проблема", "осторожно",
    ]
    const contextWindow = extractContext(response, companyName, 300)
    const ctxLower = contextWindow.toLowerCase()
    if (positiveWords.some((w) => ctxLower.includes(w))) {
      sentiment = "positive"
    } else if (negativeWords.some((w) => ctxLower.includes(w))) {
      sentiment = "negative"
    } else {
      sentiment = "neutral"
    }
  }

  return { brandMentioned, competitors: foundCompetitors, sources, sentiment, positionScore, sourceCategories }
}

function extractContext(text: string, keyword: string, windowSize: number): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return ""
  const start = Math.max(0, idx - windowSize / 2)
  const end = Math.min(text.length, idx + windowSize / 2)
  return text.slice(start, end)
}
