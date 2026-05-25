import { Redis } from "@upstash/redis"

let _redis: Redis | null = null

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  if (!url || !url.startsWith("https")) return null
  if (!_redis) {
    try {
      _redis = new Redis({
        url,
        token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
      })
    } catch {
      return null
    }
  }
  return _redis
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return true // gracefully degrade if Redis not configured
  try {
    const count = await redis.incr(key)
    if (count === 1) await redis.expire(key, windowSeconds)
    return count <= limit
  } catch {
    return true
  }
}
