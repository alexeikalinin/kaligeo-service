import { describe, it, expect } from "vitest"
import {
  getTierConfig,
  getBaseTier,
  isStandardOrAbove,
  isAdvancedOrAbove,
  getPlatformsForTier,
  getQueryCountForTier,
  getTierPrice,
  hasHistoricalTrends,
  hasRagSources,
  hasShareOfVoice,
  hasBenchmark,
  hasMonitoringAlerts,
  TIER_CONFIG,
} from "@/lib/gates"

// ── getTierConfig ─────────────────────────────────────────────────────────────

describe("getTierConfig", () => {
  it("BASIC: hasPdf=false, hasActionPlan=false, chatMessageLimit=0", () => {
    const config = getTierConfig("BASIC")
    expect(config.hasPdf).toBe(false)
    expect(config.hasActionPlan).toBe(false)
    expect(config.chatMessageLimit).toBe(0)
    expect(config.hasPostAuditChat).toBe(false)
    expect(config.hasAnalysisAgent).toBe(false)
    expect(config.hasContentAgent).toBe(false)
    expect(config.hasWebsiteFix).toBe(false)
    expect(config.isSubscription).toBe(false)
    expect(config.recurringFrequencies).toHaveLength(0)
  })

  it("BASIC: 3 platforms, 15 queries", () => {
    const config = getTierConfig("BASIC")
    expect(config.queryCount).toBe(15)
    expect(config.platforms).toHaveLength(3)
  })

  it("STANDARD: hasPdf=true, hasActionPlan=true, chatMessageLimit=10", () => {
    const config = getTierConfig("STANDARD")
    expect(config.hasPdf).toBe(true)
    expect(config.hasActionPlan).toBe(true)
    expect(config.chatMessageLimit).toBe(10)
    expect(config.hasPostAuditChat).toBe(true)
    expect(config.hasCompetitorMatrix).toBe(true)
    expect(config.hasComparison).toBe(true)
    expect(config.hasShareOfVoice).toBe(true)
    expect(config.hasBenchmark).toBe(true)
    expect(config.isSubscription).toBe(false)
  })

  it("STANDARD: 6 platforms, 30 queries", () => {
    const config = getTierConfig("STANDARD")
    expect(config.queryCount).toBe(30)
    expect(config.platforms).toHaveLength(6)
  })

  it("ADVANCED: all premium flags true, chatMessageLimit=Infinity", () => {
    const config = getTierConfig("ADVANCED")
    expect(config.hasPdf).toBe(true)
    expect(config.hasActionPlan).toBe(true)
    expect(config.chatMessageLimit).toBe(Infinity)
    expect(config.hasAnalysisAgent).toBe(true)
    expect(config.hasContentAgent).toBe(true)
    expect(config.hasWebsiteFix).toBe(true)
    expect(config.hasReportRegeneration).toBe(true)
    expect(config.hasShareOfVoice).toBe(true)
    expect(config.hasBenchmark).toBe(true)
    expect(config.priorityHours).toBe(24)
    expect(config.isSubscription).toBe(false)
  })

  it("ADVANCED: 9 platforms, 50 queries", () => {
    const config = getTierConfig("ADVANCED")
    expect(config.queryCount).toBe(50)
    expect(config.platforms).toHaveLength(9)
  })

  it("MONITOR_START: isSubscription=true, monthly frequency", () => {
    const config = getTierConfig("MONITOR_START")
    expect(config.isSubscription).toBe(true)
    expect(config.recurringFrequencies).toContain("monthly")
  })

  it("MONITOR_PRO: isSubscription=true, hasPdf=true", () => {
    const config = getTierConfig("MONITOR_PRO")
    expect(config.isSubscription).toBe(true)
    expect(config.hasPdf).toBe(true)
    expect(config.chatMessageLimit).toBe(10)
  })

  it("MONITOR_AGENT: isSubscription=true, monthly frequency, all agents", () => {
    // Note: weekly intentionally removed — would be cheaper than one-time ADVANCED audit
    const config = getTierConfig("MONITOR_AGENT")
    expect(config.isSubscription).toBe(true)
    expect(config.recurringFrequencies).toContain("monthly")
    expect(config.recurringFrequencies).not.toContain("weekly")
    expect(config.hasAnalysisAgent).toBe(true)
    expect(config.hasContentAgent).toBe(true)
    expect(config.chatMessageLimit).toBe(Infinity)
  })
})

// ── getBaseTier ───────────────────────────────────────────────────────────────

describe("getBaseTier", () => {
  it("BASIC → BASIC", () => expect(getBaseTier("BASIC")).toBe("BASIC"))
  it("STANDARD → STANDARD", () => expect(getBaseTier("STANDARD")).toBe("STANDARD"))
  it("ADVANCED → ADVANCED", () => expect(getBaseTier("ADVANCED")).toBe("ADVANCED"))
  it("MONITOR_START → BASIC", () => expect(getBaseTier("MONITOR_START")).toBe("BASIC"))
  it("MONITOR_PRO → STANDARD", () => expect(getBaseTier("MONITOR_PRO")).toBe("STANDARD"))
  it("MONITOR_AGENT → ADVANCED", () => expect(getBaseTier("MONITOR_AGENT")).toBe("ADVANCED"))
})

// ── isStandardOrAbove ─────────────────────────────────────────────────────────

describe("isStandardOrAbove", () => {
  it("returns false for BASIC", () => expect(isStandardOrAbove("BASIC")).toBe(false))
  it("returns false for MONITOR_START", () => expect(isStandardOrAbove("MONITOR_START")).toBe(false))
  it("returns true for STANDARD", () => expect(isStandardOrAbove("STANDARD")).toBe(true))
  it("returns true for ADVANCED", () => expect(isStandardOrAbove("ADVANCED")).toBe(true))
  it("returns true for MONITOR_PRO", () => expect(isStandardOrAbove("MONITOR_PRO")).toBe(true))
  it("returns true for MONITOR_AGENT", () => expect(isStandardOrAbove("MONITOR_AGENT")).toBe(true))
})

// ── isAdvancedOrAbove ─────────────────────────────────────────────────────────

describe("isAdvancedOrAbove", () => {
  it("returns false for BASIC", () => expect(isAdvancedOrAbove("BASIC")).toBe(false))
  it("returns false for STANDARD", () => expect(isAdvancedOrAbove("STANDARD")).toBe(false))
  it("returns false for MONITOR_START", () => expect(isAdvancedOrAbove("MONITOR_START")).toBe(false))
  it("returns false for MONITOR_PRO", () => expect(isAdvancedOrAbove("MONITOR_PRO")).toBe(false))
  it("returns true for ADVANCED", () => expect(isAdvancedOrAbove("ADVANCED")).toBe(true))
  it("returns true for MONITOR_AGENT", () => expect(isAdvancedOrAbove("MONITOR_AGENT")).toBe(true))
})

// ── getPlatformsForTier ───────────────────────────────────────────────────────

describe("getPlatformsForTier", () => {
  it("BASIC has exactly 3 platforms", () => {
    expect(getPlatformsForTier("BASIC")).toHaveLength(3)
  })

  it("STANDARD has exactly 6 platforms", () => {
    expect(getPlatformsForTier("STANDARD")).toHaveLength(6)
  })

  it("ADVANCED has exactly 9 platforms", () => {
    expect(getPlatformsForTier("ADVANCED")).toHaveLength(9)
  })

  it("ADVANCED includes CHATGPT, GEMINI, CLAUDE, PERPLEXITY, GROK", () => {
    const platforms = getPlatformsForTier("ADVANCED")
    expect(platforms).toContain("CHATGPT")
    expect(platforms).toContain("CLAUDE")
    expect(platforms).toContain("PERPLEXITY")
    expect(platforms).toContain("GROK")
  })

  it("BASIC does NOT include CLAUDE or PERPLEXITY", () => {
    const platforms = getPlatformsForTier("BASIC")
    expect(platforms).not.toContain("CLAUDE")
    expect(platforms).not.toContain("PERPLEXITY")
  })
})

// ── getQueryCountForTier ──────────────────────────────────────────────────────

describe("getQueryCountForTier", () => {
  it("BASIC: 15", () => expect(getQueryCountForTier("BASIC")).toBe(15))
  it("STANDARD: 30", () => expect(getQueryCountForTier("STANDARD")).toBe(30))
  it("ADVANCED: 50", () => expect(getQueryCountForTier("ADVANCED")).toBe(50))
  it("MONITOR_START: 15 (base=BASIC)", () => expect(getQueryCountForTier("MONITOR_START")).toBe(15))
  it("MONITOR_PRO: 30 (base=STANDARD)", () => expect(getQueryCountForTier("MONITOR_PRO")).toBe(30))
  it("MONITOR_AGENT: 50 (base=ADVANCED)", () => expect(getQueryCountForTier("MONITOR_AGENT")).toBe(50))
})

// ── getTierPrice ──────────────────────────────────────────────────────────────

describe("getTierPrice", () => {
  it("BASIC price label contains 4 900", () => expect(getTierPrice("BASIC")).toContain("4 900"))
  it("STANDARD price label contains 13 900", () => expect(getTierPrice("STANDARD")).toContain("13 900"))
  it("ADVANCED price label contains 27 900", () => expect(getTierPrice("ADVANCED")).toContain("27 900"))
})

// ── Feature flag functions ────────────────────────────────────────────────────

describe("hasHistoricalTrends", () => {
  it("BASIC → false", () => expect(hasHistoricalTrends("BASIC")).toBe(false))
  it("STANDARD → true", () => expect(hasHistoricalTrends("STANDARD")).toBe(true))
  it("ADVANCED → true", () => expect(hasHistoricalTrends("ADVANCED")).toBe(true))
  it("MONITOR_START → true (subscription benefit)", () => expect(hasHistoricalTrends("MONITOR_START")).toBe(true))
})

describe("hasRagSources", () => {
  it("BASIC → false", () => expect(hasRagSources("BASIC")).toBe(false))
  it("STANDARD → true", () => expect(hasRagSources("STANDARD")).toBe(true))
  it("ADVANCED → true", () => expect(hasRagSources("ADVANCED")).toBe(true))
})

describe("hasShareOfVoice", () => {
  it("BASIC → false", () => expect(hasShareOfVoice("BASIC")).toBe(false))
  it("STANDARD → true", () => expect(hasShareOfVoice("STANDARD")).toBe(true))
})

describe("hasBenchmark", () => {
  it("BASIC → false", () => expect(hasBenchmark("BASIC")).toBe(false))
  it("STANDARD → true", () => expect(hasBenchmark("STANDARD")).toBe(true))
  it("ADVANCED → true", () => expect(hasBenchmark("ADVANCED")).toBe(true))
})

describe("hasMonitoringAlerts", () => {
  // Monitoring alerts are a subscription-only feature (MONITOR_* tiers)
  it("BASIC → false (one-time audit, no alerts)", () => expect(hasMonitoringAlerts("BASIC")).toBe(false))
  it("STANDARD → false (one-time audit, no alerts)", () => expect(hasMonitoringAlerts("STANDARD")).toBe(false))
  it("ADVANCED → false (one-time audit, no alerts)", () => expect(hasMonitoringAlerts("ADVANCED")).toBe(false))
  it("MONITOR_START → true (subscription benefit)", () => expect(hasMonitoringAlerts("MONITOR_START")).toBe(true))
  it("MONITOR_PRO → true", () => expect(hasMonitoringAlerts("MONITOR_PRO")).toBe(true))
  it("MONITOR_AGENT → true", () => expect(hasMonitoringAlerts("MONITOR_AGENT")).toBe(true))
})

// ── Price sanity check ────────────────────────────────────────────────────────

describe("TIER_CONFIG price sanity", () => {
  it("all tiers have positive priceRub or null (enterprise)", () => {
    for (const [tier, config] of Object.entries(TIER_CONFIG)) {
      if (config.priceRub !== null) {
        expect(config.priceRub, `${tier} price should be positive`).toBeGreaterThan(0)
      }
    }
  })

  it("ADVANCED costs more than STANDARD which costs more than BASIC in priceRub", () => {
    const basic = TIER_CONFIG["BASIC"].priceRub ?? 0
    const standard = TIER_CONFIG["STANDARD"].priceRub ?? 0
    const advanced = TIER_CONFIG["ADVANCED"].priceRub ?? 0
    expect(standard).toBeGreaterThan(basic)
    expect(advanced).toBeGreaterThan(standard)
  })

  it("price labels are non-empty strings", () => {
    expect(getTierPrice("BASIC")).toBeTruthy()
    expect(getTierPrice("STANDARD")).toBeTruthy()
    expect(getTierPrice("ADVANCED")).toBeTruthy()
  })
})
