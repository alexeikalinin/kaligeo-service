export const ALLOWED_ORIGINS = [
  "https://kaligeo.by",
  "https://www.kaligeo.by",
  "https://kaligeo.ru",
  "https://www.kaligeo.ru",
  "https://app.kaligeo.ru",
  "http://localhost:3000",
]

export function getCorsHeaders(origin: string | null): HeadersInit {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  }
}

export function corsOptionsResponse(origin: string | null) {
  return new Response(null, { status: 204, headers: getCorsHeaders(origin) })
}
