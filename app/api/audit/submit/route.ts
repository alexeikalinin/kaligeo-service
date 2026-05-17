import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { Redis } from "@upstash/redis"
import { notifyNewAuditRequest } from "@/lib/notify"

const PLATFORMS = ["CHATGPT", "CLAUDE", "GEMINI", "PERPLEXITY", "DEEPSEEK", "YANDEXGPT", "GIGACHAT", "ALISA", "GROK"] as const

const SubmitSchema = z.object({
  clientEmail: z.string().email(),
  websiteUrl: z.string().url(),
  companyName: z.string().min(1).max(100),
  niche: z.string().min(1).max(200),
  competitors: z.array(z.string()).max(10).default([]),
  tier: z.enum(["BASIC", "STANDARD", "ADVANCED"]).default("STANDARD"),
  selectedPlatforms: z.array(z.enum(PLATFORMS)).optional(),
  baselineJobId: z.string().optional(),
  followUpScheduledAt: z.string().datetime().optional(),
  source: z.string().max(64).optional(),
})

const RATE_LIMIT = 3
const WINDOW_SECONDS = 3600

async function checkRateLimit(ip: string): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return true

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
    return true
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

    const email = data.clientEmail.toLowerCase().trim()

    // Upsert client — создаём если новый, иначе обновляем имя компании
    const client = await prisma.client.upsert({
      where: { email },
      update: { companyName: data.companyName, websiteUrl: data.websiteUrl },
      create: { email, companyName: data.companyName, websiteUrl: data.websiteUrl },
    })

    const job = await prisma.auditJob.create({
      data: {
        clientEmail: email,
        clientId: client.id,
        websiteUrl: data.websiteUrl,
        companyName: data.companyName,
        niche: data.niche,
        competitors: data.competitors,
        tier: data.tier,
        status: "PENDING_PAYMENT",
        ...(data.selectedPlatforms?.length ? { selectedPlatforms: data.selectedPlatforms } : {}),
        ...(data.baselineJobId ? { baselineJobId: data.baselineJobId } : {}),
        ...(data.followUpScheduledAt ? { followUpScheduledAt: new Date(data.followUpScheduledAt) } : {}),
        ...(data.source ? { source: data.source } : {}),
      },
    })

    // Fire-and-forget — не блокируем ответ клиенту
    notifyNewAuditRequest({
      companyName: data.companyName,
      clientEmail: email,
      websiteUrl: data.websiteUrl,
      tier: data.tier,
      clientNumber: client.clientNumber,
      jobId: job.id,
    }).catch(console.error)

    return NextResponse.json({
      success: true,
      jobId: job.id,
      message: "Заявка принята. После подтверждения оплаты мы запустим аудит и отправим отчёт на ваш email в течение 48 часов.",
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Audit submit error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
