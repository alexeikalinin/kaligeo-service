import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export type Region = 'ru' | 'by' | 'default'

function detectRegion(host: string): Region {
  if (host.includes('kaligeo.ru')) return 'ru'
  if (host.includes('kaligeo.by')) return 'by'
  return 'default'
}

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const region = detectRegion(host)

  const response = NextResponse.next()
  response.headers.set('x-region', region)
  response.headers.set('x-host', host)
  return response
}

export const config = {
  // Применяем ко всем страницам кроме статики и системных роутов Next.js
  matcher: ['/((?!_next/static|_next/image|favicon|api/telegram|api/internal).*)'],
}
