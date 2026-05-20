/**
 * GET /api/payment/status?orderId=<id>
 *
 * Проверяет статус заказа в Альфа-Банке (Беларусь).
 * Вызывается после редиректа от банка для серверной верификации.
 *
 * orderStatus значения:
 *   0 — зарегистрирован, не оплачен
 *   1 — предавторизован
 *   2 — ОПЛАЧЕН (полная авторизация)
 *   3 — отменён
 *   4 — возврат
 *   5 — авторизация через ACS банка-эмитента
 *   6 — отклонён
 */
import { NextRequest, NextResponse } from 'next/server'

const SANDBOX_URL = 'https://sandbox.alfabank.by/payment/rest'
const PROD_URL    = 'https://ecom.alfabank.by/payment/rest'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const orderId = searchParams.get('orderId')

  if (!orderId) {
    return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
  }

  const isSandbox = process.env.ALFABANK_SANDBOX === 'true'
  const baseUrl   = isSandbox ? SANDBOX_URL : PROD_URL

  const params = new URLSearchParams({
    userName: process.env.ALFABANK_USER || '',
    password: process.env.ALFABANK_PASS || '',
    orderId,
    language: 'ru',
  })

  try {
    const bankResp = await fetch(`${baseUrl}/getOrderStatusExtended.do`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    params.toString(),
    })

    const data = await bankResp.json() as {
      orderStatus?: number
      actionCode?: number
      amount?: number
      currency?: string
      errorCode?: number
      errorMessage?: string
    }

    return NextResponse.json({
      orderId,
      orderStatus:  data.orderStatus,
      paid:         data.orderStatus === 2,
      actionCode:   data.actionCode,
      amount:       data.amount,
      currency:     data.currency,
      errorCode:    data.errorCode,
      errorMessage: data.errorMessage,
    })

  } catch (err) {
    console.error('[payment/status]', err)
    return NextResponse.json({ error: 'Bank API unavailable' }, { status: 502 })
  }
}
