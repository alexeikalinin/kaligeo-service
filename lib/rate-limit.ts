import { Redis } from "@upstash/redis"

let _redis: Redis | null = null

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
    })
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
