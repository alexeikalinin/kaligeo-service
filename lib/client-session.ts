import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"

const COOKIE = "client_session"
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

function secret() {
  return process.env.CLIENT_SESSION_SECRET ?? process.env.ADMIN_SESSION_TOKEN ?? "dev-secret"
}

export function signSession(clientId: string): string {
  const ts = Date.now().toString()
  const payload = `${clientId}:${ts}`
  const sig = createHmac("sha256", secret()).update(payload).digest("hex")
  return `${payload}:${sig}`
}

export function verifySession(value: string): string | null {
  const parts = value.split(":")
  if (parts.length !== 3) return null
  const [clientId, ts, sig] = parts
  const payload = `${clientId}:${ts}`
  const expected = createHmac("sha256", secret()).update(payload).digest("hex")
  try {
    if (!timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"))) return null
  } catch {
    return null
  }
  const age = Date.now() - parseInt(ts, 10)
  if (age > MAX_AGE * 1000) return null
  return clientId
}

export async function getClientSession(): Promise<string | null> {
  const cookieStore = await cookies()
  const value = cookieStore.get(COOKIE)?.value
  if (!value) return null
  return verifySession(value)
}

export function sessionCookieOptions() {
  return {
    name: COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: MAX_AGE,
    path: "/",
  }
}
