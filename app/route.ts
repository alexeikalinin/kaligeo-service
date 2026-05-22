/**
 * GET /
 *
 * Отдаёт HTML лендинга с региональной адаптацией:
 *   kaligeo.ru  → цены в RUB, canonical ru, платёж YooKassa (placeholder)
 *   kaligeo.by  → цены в BYN, canonical by, платёж Альфа-Банк
 *
 * Регион определяется middleware.ts → x-region header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import path from 'path'

interface RegionPatch {
  canonical: string
  orgUrl: string
  orgEmail: string
  ogUrl: string
  ctaApiPath: string
  yandexVerification?: string // перекрывает тег из index.html
}

const PATCHES: Record<string, RegionPatch> = {
  by: {
    canonical:  'https://kaligeo.by/',
    orgUrl:     'https://kaligeo.by',
    orgEmail:   'hello@kaligeo.by',
    ogUrl:      'https://kaligeo.by/',
    ctaApiPath: '/api/payment/create',
    yandexVerification: '065bd60ddfaff2db',
  },
  ru: {
    canonical:  'https://kaligeo.ru/',
    orgUrl:     'https://kaligeo.ru',
    orgEmail:   'hello@kaligeo.ru',
    ogUrl:      'https://kaligeo.ru/',
    ctaApiPath: '/api/payment/create',
  },
  default: {
    canonical:  'https://kaligeo.ru/',
    orgUrl:     'https://kaligeo.ru',
    orgEmail:   'hello@kaligeo.ru',
    ogUrl:      'https://kaligeo.ru/',
    ctaApiPath: '/api/payment/create',
  },
}

function patchHtml(html: string, region: string): string {
  const p = PATCHES[region] ?? PATCHES.default

  let result = html
    // canonical
    .replace(
      /<link rel="canonical" href="[^"]*">/,
      `<link rel="canonical" href="${p.canonical}">`
    )
    // og:url
    .replace(
      /<meta property="og:url" content="[^"]*">/,
      `<meta property="og:url" content="${p.ogUrl}">`
    )
    // og:image (domain)
    .replace(/https:\/\/kaligeo\.ru\//g, p.canonical)
    // JSON-LD org url
    .replace(/"url": "https:\/\/kaligeo\.ru"/g, `"url": "${p.orgUrl}"`)
    .replace(/"email": "hello@kaligeo\.ru"/g, `"email": "${p.orgEmail}"`)
    // Payment API path (if landing calls /api/create-payment)
    .replace(/\/api\/create-payment/g, p.ctaApiPath)
    .replace(/\/api\/payment-status/g, '/api/payment/status')
    // Inject region marker for JS scripts
    .replace(
      '</head>',
      `<meta name="x-region" content="${region}">\n</head>`
    )

  // Подменить yandex-verification если для региона задан свой токен
  if (p.yandexVerification) {
    result = result.replace(
      /<meta name="yandex-verification" content="[^"]*">/,
      `<meta name="yandex-verification" content="${p.yandexVerification}">`
    )
  }

  return result
}

export async function GET(request: NextRequest) {
  const region = request.headers.get('x-region') ?? 'default'

  let html: string
  try {
    const htmlPath = path.join(process.cwd(), 'landing', 'index.html')
    html = readFileSync(htmlPath, 'utf-8')
  } catch {
    return new NextResponse('Landing not found', { status: 404 })
  }

  const patched = patchHtml(html, region)

  return new NextResponse(patched, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
    },
  })
}
