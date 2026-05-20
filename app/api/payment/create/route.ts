/**
 * POST /api/payment/create
 *
 * Создаёт заказ в Альфа-Банке (Беларусь) и возвращает ссылку на оплату.
 * Используется на домене kaligeo.by.
 *
 * Env vars:
 *   ALFABANK_USER    — логин мерчанта
 *   ALFABANK_PASS    — пароль мерчанта
 *   ALFABANK_SANDBOX — "true" для тестовой среды
 *
 * Документация: https://sandbox.alfabank.by/sandbox/
 */
import { NextRequest, NextResponse } from 'next/server'

const SANDBOX_URL = 'https://sandbox.alfabank.by/payment/rest'
const PROD_URL    = 'https://ecom.alfabank.by/payment/rest'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)

  const { plan, amount, orderNumber, description } = body ?? {}
  if (!plan || !amount || !orderNumber) {
    return NextResponse.json({ error: 'Missing required fields: plan, amount, orderNumber' }, { status: 400 })
  }

  const isSandbox = process.env.ALFABANK_SANDBOX === 'true'
  const baseUrl   = isSandbox ? SANDBOX_URL : PROD_URL
  const siteUrl   = process.env.NEXT_PUBLIC_APP_URL || 'https://kaligeo.by'

  const params = new URLSearchParams({
    userName:    process.env.ALFABANK_USER    || '',
    password:    process.env.ALFABANK_PASS    || '',
    orderNumber: String(orderNumber),
    amount:      String(amount),   // в копейках (BYN × 100)
    currency:    '933',            // 933 = BYN (ISO 4217)
    returnUrl:   `${siteUrl}/?orderId={orderId}&paymentStatus=success`,
    failUrl:     `${siteUrl}/?orderId={orderId}&paymentStatus=fail`,
    description: description || `KaliGEO — тариф ${plan}`,
    language:    'ru',
    pageView:    'DESKTOP',
  })

  try {
    const bankResp = await fetch(`${baseUrl}/register.do`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    })

    if (!bankResp.ok) {
      throw new Error(`Bank API HTTP ${bankResp.status}`)
    }

    const data = await bankResp.json() as { errorCode?: number; errorMessage?: string; orderId?: string; formUrl?: string }

    if (data.errorCode && data.errorCode !== 0) {
      return NextResponse.json(
        { errorCode: data.errorCode, errorMessage: data.errorMessage || 'Ошибка создания заказа' },
        { status: 400 }
      )
    }

    return NextResponse.json({ orderId: data.orderId, formUrl: data.formUrl })

  } catch (err) {
    console.error('[payment/create]', err)
    return NextResponse.json({ error: 'Bank API unavailable' }, { status: 502 })
  }
}
