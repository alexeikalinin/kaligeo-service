import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tasks } from "@trigger.dev/sdk/v3"
import { auditPipeline } from "@/trigger/audit-pipeline"
import { z } from "zod"
import { Redis } from "@upstash/redis"

const SubmitSchema = z.object({
  clientEmail: z.string().email(),
  websiteUrl: z.string().url(),
  companyName: z.string().min(1).max(100),
  niche: z.string().min(1).max(200),
  competitors: z.array(z.string()).max(10).default([]),
  tier: z.enum(["BASIC", "STANDARD", "ADVANCED"]).default("STANDARD"),
})

// Rate limit: 3 аудита с одного IP в час
const RATE_LIMIT = 3
const WINDOW_SECONDS = 3600

async function checkRateLimit(ip: string): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return true // skip if not configured

  try {
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    })
    const key = `rl:audit:${ip}`
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, WINDOW_SECONDS)
    return count <= RATE_LIMIT
  } catch {
    return true // fail open — не блокируем если Redis недоступен
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"
  const allowed = await checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Попробуйте через час." },
      { status: 429 }
    )
  }

  try {
    const body = await req.json()
    const data = SubmitSchema.parse(body)

    const job = await prisma.auditJob.create({
      data: {
        clientEmail: data.clientEmail.toLowerCase().trim(),
        websiteUrl: data.websiteUrl,
        companyName: data.companyName,
        niche: data.niche,
        competitors: data.competitors,
        tier: data.tier,
      },
    })

    await tasks.trigger<typeof auditPipeline>("audit-pipeline", { jobId: job.id })

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Аудит запущен. Мы отправим отчёт на ваш email в течение 48 часов.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Audit submit error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
