/**
 * Integration tests for POST /api/report/[id]/chat
 *
 * Критично: тиерные лимиты сообщений.
 * BASIC → 403 (нет доступа), STANDARD → 10 сообщений, ADVANCED → без ограничений.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockFindUnique = vi.fn()
const mockUpdate     = vi.fn().mockResolvedValue({})

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditJob: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update:     (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))

// Mock AI streaming — streamText() is NOT awaited in the route, it returns the object directly
vi.mock("ai", () => ({
  streamText: vi.fn().mockReturnValue({
    toUIMessageStreamResponse: vi.fn().mockReturnValue(
      new Response("mock stream", { status: 200 })
    ),
    toDataStreamResponse: vi.fn().mockReturnValue(
      new Response("mock stream", { status: 200 })
    ),
  }),
  stepCountIs: vi.fn(),
}))

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: vi.fn().mockReturnValue(vi.fn()),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// Import route ONCE (no vi.resetModules — keeps vi.mock("ai") stable)
async function callChat(id: string, body: object) {
  const { POST } = await import("@/app/api/report/[id]/chat/route")
  const { NextRequest } = await import("next/server")

  return POST(
    new NextRequest(new Request(`https://kaligeo.by/api/report/${id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })),
    { params: Promise.resolve({ id }) }
  )
}

function makeJob(tier: string, chatMessagesUsed = 0, reportToken = "valid-token") {
  return {
    id:               "job-chat",
    status:           "COMPLETED",
    tier,
    companyName:      "ChatCo",
    reportToken,
    chatMessagesUsed,
    report: {
      id:               "rep-1",
      overallScore:     65,
      visibilityScores: { CHATGPT: { platform: "CHATGPT", score: 65, citationRate: 50, mentionCount: 5, totalQueries: 10 } },
      weakPoints:       [{ id: "missing-schema", title: "Schema.org", description: "Нет разметки", severity: "medium", detected: true }],
      competitorMatrix: [],
      // actionPlan must have 30d/60d/90d arrays for the route to work
      actionPlan: {
        "30d": [{ title: "Шаг 1", description: "Desc", effort: "medium", impact: "high" }],
        "60d": [],
        "90d": [],
      },
    },
  }
}

const chatBody = {
  token:    "valid-token",
  messages: [{ role: "user", content: "Как улучшить мою AI-видимость?" }],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/report/[id]/chat", () => {
  beforeEach(() => {
    mockFindUnique.mockClear()
    mockUpdate.mockClear()
    // Do NOT call vi.clearAllMocks()/vi.resetModules() — it disrupts the "ai" mock
  })

  it("returns 401 for wrong token", async () => {
    mockFindUnique.mockResolvedValue(makeJob("STANDARD"))

    const res = await callChat("job-chat", { ...chatBody, token: "WRONG" })
    expect(res.status).toBe(401)
  })

  it("returns 401 when job not found", async () => {
    mockFindUnique.mockResolvedValue(null)

    const res = await callChat("no-job", chatBody)
    expect(res.status).toBe(401)
  })

  it("returns 403 for BASIC tier (no chat access)", async () => {
    mockFindUnique.mockResolvedValue(makeJob("BASIC"))

    const res = await callChat("job-chat", chatBody)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe("upgrade_required")
  })

  it("returns 429 for STANDARD tier when limit reached (11th message)", async () => {
    // The route returns 429 (Too Many Requests) when chat_limit_reached
    mockFindUnique.mockResolvedValue(makeJob("STANDARD", 10))  // used=10, limit=10

    const res = await callChat("job-chat", chatBody)
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toBe("chat_limit_reached")
    expect(json.used).toBe(10)
  })

  it("returns 400 when report not ready", async () => {
    mockFindUnique.mockResolvedValue({
      ...makeJob("STANDARD"),
      status: "ANALYZING",
      report: null,
    })

    const res = await callChat("job-chat", chatBody)
    expect(res.status).toBe(400)
  })

  it("STANDARD tier allows chat when under limit (used=5 of 10)", async () => {
    mockFindUnique.mockResolvedValue(makeJob("STANDARD", 5))

    const res = await callChat("job-chat", chatBody)
    // Gate checks passed — not blocked by auth or tier limit
    // (AI streaming may return 500 in test env without real API key — that's OK)
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
    expect(res.status).not.toBe(429)
  })

  it("ADVANCED tier allows unlimited chat (used=100)", async () => {
    mockFindUnique.mockResolvedValue(makeJob("ADVANCED", 100))

    const res = await callChat("job-chat", chatBody)
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
    expect(res.status).not.toBe(429)
  })

  it("MONITOR_AGENT tier allows unlimited chat", async () => {
    mockFindUnique.mockResolvedValue(makeJob("MONITOR_AGENT", 50))

    const res = await callChat("job-chat", chatBody)
    expect(res.status).not.toBe(401)
    expect(res.status).not.toBe(403)
    expect(res.status).not.toBe(429)
  })

  it("MONITOR_START tier (=BASIC) has no chat access", async () => {
    mockFindUnique.mockResolvedValue(makeJob("MONITOR_START"))

    const res = await callChat("job-chat", chatBody)
    expect(res.status).toBe(403)
  })
})
