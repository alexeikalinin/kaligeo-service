/**
 * Единый источник правды для регионального контента.
 * Каждый домен → свой регион → своя конфигурация.
 *
 * Домены:
 *   kaligeo.ru  → 'ru'
 *   kaligeo.by  → 'by'
 *   всё остальное → 'default' (алиас 'by')
 *
 * Чтобы добавить/изменить правку для региона — используй /region агент
 * или правь этот файл напрямую.
 */

export type Region = 'ru' | 'by' | 'default'

export interface RegionPrice {
  amount: number
  currency: 'RUB' | 'BYN' | 'USD'
  symbol: string
  label: string
}

export interface RegionTier {
  basic: RegionPrice
  standard: RegionPrice
  advanced: RegionPrice
}

export interface RegionPayment {
  provider: 'alfabank' | 'yookassa' | 'manual'
  /** Подпись на кнопке оплаты */
  label: string
  /** Валюта ISO-4217 */
  currency: string
  /** Числовой код валюты для Альфа-Банка */
  currencyCode?: string
}

export interface RegionContact {
  email: string
  phone?: string
  telegram?: string
}

export interface RegionLegal {
  companyName: string
  taxId: string
  address: string
  bank?: string
  bic?: string
  account?: string
}

export interface RegionQueryExamples {
  /** Короткий заголовок примера */
  title: string
  /** Текст запроса к AI */
  query: string
  /** Платформа */
  platform: string
}

export interface RegionConfig {
  id: Region
  name: string
  locale: string
  prices: RegionTier
  payment: RegionPayment
  contact: RegionContact
  legal: RegionLegal
  /** Примеры запросов для hero/демо-секции */
  queryExamples: RegionQueryExamples[]
  /** Ключевые слова для SEO canonical */
  canonicalOrigin: string
}

// ─── Конфигурации регионов ────────────────────────────────────────────────────

const BY: RegionConfig = {
  id: 'by',
  name: 'Беларусь',
  locale: 'ru-BY',
  canonicalOrigin: 'https://kaligeo.by',

  prices: {
    basic:    { amount: 14900, currency: 'BYN', symbol: 'BYN', label: '149 BYN' },
    standard: { amount: 44900, currency: 'BYN', symbol: 'BYN', label: '449 BYN' },
    advanced: { amount: 89900, currency: 'BYN', symbol: 'BYN', label: '899 BYN' },
    // amount в копейках (×100) для Альфа-Банк API
  },

  payment: {
    provider: 'alfabank',
    label: 'Оплатить картой',
    currency: 'BYN',
    currencyCode: '933', // ISO 4217
  },

  contact: {
    email: 'hello@kaligeo.by',
    phone: '+375 (44) 765-42-31',
  },

  legal: {
    companyName: 'ООО «KaliGEO»',
    taxId: 'УНП HB0983375',
    address: 'Республика Беларусь, 220000, г. Минск, ул. Независимости, 1',
    bank: 'ЗАО «Альфа-Банк»',
    bic: 'ALFABY2X',
    account: 'BY00 ALFA 0000 0000 0000 0000 0000',
  },

  queryExamples: [
    {
      title: 'Бухгалтерия в Минске',
      query: 'Лучшие бухгалтерские компании для малого бизнеса в Беларуси?',
      platform: 'ChatGPT',
    },
    {
      title: 'IT-аутсорсинг BY',
      query: 'Надёжные IT-компании для аутсорсинга разработки в Минске?',
      platform: 'GigaChat',
    },
    {
      title: 'Юридические услуги',
      query: 'Какие юридические фирмы рекомендуются для регистрации ООО в Беларуси?',
      platform: 'Perplexity',
    },
  ],
}

const RU: RegionConfig = {
  id: 'ru',
  name: 'Россия',
  locale: 'ru-RU',
  canonicalOrigin: 'https://kaligeo.ru',

  prices: {
    basic:    { amount: 4900,  currency: 'RUB', symbol: '₽', label: '4 900 ₽' },
    standard: { amount: 14900, currency: 'RUB', symbol: '₽', label: '14 900 ₽' },
    advanced: { amount: 29900, currency: 'RUB', symbol: '₽', label: '29 900 ₽' },
  },

  payment: {
    provider: 'yookassa', // YooKassa — запланирована, не реализована
    label: 'Оплатить картой',
    currency: 'RUB',
  },

  contact: {
    email: 'hello@kaligeo.ru',
  },

  legal: {
    companyName: 'ООО «KaliGEO»',
    taxId: 'ИНН TBD',
    address: 'TBD',
  },

  queryExamples: [
    {
      title: 'Бухгалтерия в Москве',
      query: 'Лучшие бухгалтерские компании для малого бизнеса в Москве?',
      platform: 'YandexGPT',
    },
    {
      title: 'SEO-агентства',
      query: 'Какие SEO-агентства рекомендуют в России для интернет-магазинов?',
      platform: 'GigaChat',
    },
    {
      title: 'CRM для бизнеса',
      query: 'Лучшая CRM для малого бизнеса в России в 2026 году?',
      platform: 'ChatGPT',
    },
  ],
}

// ─── Экспорт и хелперы ────────────────────────────────────────────────────────

export const REGIONS: Record<string, RegionConfig> = {
  ru: RU,
  by: BY,
  default: BY, // fallback → BY
}

export function getRegion(region: Region | string): RegionConfig {
  return REGIONS[region] ?? BY
}

/** Читает регион из Next.js headers (server component / route handler) */
export async function getRegionFromHeaders(): Promise<RegionConfig> {
  const { headers } = await import('next/headers')
  const h = await headers()
  const region = (h.get('x-region') ?? 'default') as Region
  return getRegion(region)
}
