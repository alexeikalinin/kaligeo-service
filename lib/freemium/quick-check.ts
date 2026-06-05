/**
 * Freemium Quick Check
 *
 * Runs 3 real AI queries on up to 3 platforms to produce an honest previewScore.
 * Designed to be fast (<30s) and cost-cheap (3 × 3 = 9 LLM calls max).
 *
 * Platforms used: CHATGPT, GEMINI, YANDEXGPT (BASIC tier set).
 * Falls back to estimate if a platform is unavailable or times out.
 */

import { AI_CLIENTS, getActivePlatforms } from "../ai-clients"
import { extractMentions } from "../analysis/extract-mentions"

export interface QuickCheckPlatformResult {
  platform: string
  score: number          // 0–100
  mentionCount: number
  totalQueries: number
  citationRate: number   // 0–100
}

export interface QuickCheckResult {
  overallScore: number
  platformScores: Record<string, QuickCheckPlatformResult>
  platformsChecked: string[]
  queriesRun: number
}

// These 3 platforms cover Russian + global reach and are always in BASIC tier
const FREEMIUM_PLATFORMS = ["CHATGPT", "GEMINI", "YANDEXGPT"]

// Timeout per platform (ms) — freemium must respond within ~25s total
const PLATFORM_TIMEOUT_MS = 18_000

function buildQuickQueries(companyName: string, niche: string, keywords: string[], websiteUrl: string): string[] {
  const topKeyword = keywords[0] ?? niche.split(" ").slice(0, 3).join(" ")
  const hostname = new URL(websiteUrl).hostname.replace(/^www\./, "")
  return [
    // Direct brand query — what does AI know about this domain/company?
    `Что ты знаешь о компании ${companyName} (сайт ${hostname})? Чем они занимаются, какие услуги предлагают?`,
    // Category query — is this brand mentioned as a solution?
    `Посоветуй лучшие компании для ${topKeyword}. Назови конкретные варианты.`,
    // Problem query — is this brand mentioned in the niche?
    `Ищу надёжного исполнителя в сфере ${niche}. Какие компании порекомендуешь?`,
  ]
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms)
  })
  try {
    const result = await Promise.race([promise, timeout])
    clearTimeout(timer!)
    return result
  } catch {
    clearTimeout(timer!)
    return fallback
  }
}

async function checkPlatform(
  platform: string,
  queries: string[],
  companyName: string,
  websiteUrl: string
): Promise<QuickCheckPlatformResult> {
  const client = AI_CLIENTS[platform]
  if (!client || !client.isConfigured()) {
    return { platform, score: 0, mentionCount: 0, totalQueries: 0, citationRate: 0 }
  }

  let mentionCount = 0
  let positiveCount = 0
  let totalRun = 0

  for (const query of queries) {
    try {
      const responsePromise = client.query(query)
      const response = await withTimeout(responsePromise, PLATFORM_TIMEOUT_MS / queries.length, "")
      if (!response) continue

      const mentions = extractMentions(response, companyName, websiteUrl, [], undefined)
      if (mentions.brandMentioned) mentionCount++
      if (mentions.sentiment === "positive") positiveCount++
      totalRun++

      // Small delay between queries
      await new Promise((r) => setTimeout(r, 200))
    } catch {
      // Skip failed query, don't fail the whole platform
      totalRun++
    }
  }

  if (totalRun === 0) {
    return { platform, score: 0, mentionCount: 0, totalQueries: 0, citationRate: 0 }
  }

  const citationRate = totalRun > 0 ? mentionCount / totalRun : 0
  const positiveRate = mentionCount > 0 ? positiveCount / mentionCount : 0

  // Simplified scoring (no position/source data at freemium level)
  // 60% citation, 40% sentiment — matches full formula spirit
  const score = Math.round(citationRate * 60 + positiveRate * 40)

  return {
    platform,
    score,
    mentionCount,
    totalQueries: totalRun,
    citationRate: Math.round(citationRate * 100),
  }
}

export async function runFreemiumQuickCheck(
  companyName: string,
  niche: string,
  websiteUrl: string,
  keywords: string[]
): Promise<QuickCheckResult> {
  const activePlatforms = getActivePlatforms()
  const platformsToCheck = FREEMIUM_PLATFORMS.filter((p) => activePlatforms.includes(p))

  if (platformsToCheck.length === 0) {
    // No platforms configured — return honest 0 rather than fake estimate
    return {
      overallScore: 0,
      platformScores: {},
      platformsChecked: [],
      queriesRun: 0,
    }
  }

  const queries = buildQuickQueries(companyName, niche, keywords, websiteUrl)

  // Run all platforms in parallel — faster total time
  const platformResults = await Promise.allSettled(
    platformsToCheck.map((platform) =>
      withTimeout(
        checkPlatform(platform, queries, companyName, websiteUrl),
        PLATFORM_TIMEOUT_MS + 2000, // outer safety timeout
        { platform, score: 0, mentionCount: 0, totalQueries: 0, citationRate: 0 } as QuickCheckPlatformResult
      )
    )
  )

  const platformScores: Record<string, QuickCheckPlatformResult> = {}
  let totalScore = 0
  let scoredCount = 0
  let queriesRun = 0

  for (let i = 0; i < platformResults.length; i++) {
    const result = platformResults[i]
    const platform = platformsToCheck[i]
    if (result.status === "fulfilled" && result.value.totalQueries > 0) {
      platformScores[platform] = result.value
      totalScore += result.value.score
      scoredCount++
      queriesRun += result.value.totalQueries
    }
  }

  const overallScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0

  return {
    overallScore,
    platformScores,
    platformsChecked: Object.keys(platformScores),
    queriesRun,
  }
}
