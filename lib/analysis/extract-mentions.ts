export interface MentionResult {
  brandMentioned: boolean
  competitors: string[]
  sources: string[]
  sentiment: "positive" | "neutral" | "negative" | "absent"
}

export function extractMentions(
  response: string,
  companyName: string,
  websiteUrl: string,
  competitors: string[]
): MentionResult {
  const lower = response.toLowerCase()
  const domain = new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).hostname
    .replace("www.", "")
    .toLowerCase()

  const brandMentioned =
    lower.includes(companyName.toLowerCase()) || lower.includes(domain)

  const foundCompetitors = competitors.filter((c) => lower.includes(c.toLowerCase()))

  // Extract URLs that look like sources
  const urlRegex = /https?:\/\/[^\s)>"\]]+/g
  const sources = [...new Set(response.match(urlRegex) ?? [])]

  let sentiment: MentionResult["sentiment"] = "absent"
  if (brandMentioned) {
    const positiveWords = ["recommend", "best", "excellent", "top", "great", "leading", "рекомендуем", "лучший", "отличный"]
    const negativeWords = ["avoid", "poor", "bad", "worst", "не рекомендуем", "плохой"]
    const contextWindow = extractContext(response, companyName, 200)
    if (positiveWords.some((w) => contextWindow.toLowerCase().includes(w))) {
      sentiment = "positive"
    } else if (negativeWords.some((w) => contextWindow.toLowerCase().includes(w))) {
      sentiment = "negative"
    } else {
      sentiment = "neutral"
    }
  }

  return { brandMentioned, competitors: foundCompetitors, sources, sentiment }
}

function extractContext(text: string, keyword: string, windowSize: number): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase())
  if (idx === -1) return ""
  const start = Math.max(0, idx - windowSize / 2)
  const end = Math.min(text.length, idx + windowSize / 2)
  return text.slice(start, end)
}
