"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ReportDashboard } from "@/components/report/ReportDashboard"
import type { HallucinationItem } from "@/components/report/HallucinationAudit"
import type { SourceEntry } from "@/components/report/SourceAuthority"
import type { VerbatimQuote } from "@/components/report/VerbatimInsights"
import type { PlatformInsight } from "@/components/report/PlatformIntelligence"
import type { ShareOfVoiceResult } from "@/lib/analysis/share-of-voice"
import type { CompetitivePosition } from "@/lib/analysis/competitive-positioning"

type Tier = "BASIC" | "STANDARD" | "ADVANCED"
type Currency = "RUB" | "USD" | "BYN"

// ── Competitor name mapping (anonymized) ─────────────────────────────────────
const C1 = "Конкурент 1"
const C2 = "Конкурент 2"
const C3 = "Конкурент 3"
const C4 = "Конкурент 4"
const C5 = "Конкурент 5"

// ── Currency config ───────────────────────────────────────────────────────────

const CURRENCIES: { key: Currency; label: string }[] = [
  { key: "RUB", label: "₽ RUB" },
  { key: "USD", label: "$ USD" },
  { key: "BYN", label: "Br BYN" },
]

const TIER_PRICES: Record<Tier, Record<Currency, string>> = {
  BASIC:    { RUB: "4 900 ₽",  USD: "$55",  BYN: "175 Br" },
  STANDARD: { RUB: "13 900 ₽", USD: "$155", BYN: "495 Br" },
  ADVANCED: { RUB: "27 900 ₽", USD: "$310", BYN: "995 Br" },
}

// ── Платформы по тарифам ─────────────────────────────────────────────────────

const TIER_PLATFORMS: Record<Tier, string[]> = {
  BASIC:    ["CHATGPT", "GEMINI", "YANDEXGPT"],
  STANDARD: ["CHATGPT", "GEMINI", "YANDEXGPT", "CLAUDE", "PERPLEXITY", "DEEPSEEK"],
  ADVANCED: ["CHATGPT", "GEMINI", "YANDEXGPT", "CLAUDE", "PERPLEXITY", "DEEPSEEK"],
}

// ── Scores ───────────────────────────────────────────────────────────────────

const ALL_SCORES = {
  CHATGPT:    { platform: "CHATGPT",    score: 28, citationRate: 12, totalQueries: 50, mentionCount: 6,  positiveCount: 4 },
  CLAUDE:     { platform: "CLAUDE",     score: 41, citationRate: 18, totalQueries: 50, mentionCount: 9,  positiveCount: 6 },
  GEMINI:     { platform: "GEMINI",     score: 35, citationRate: 14, totalQueries: 50, mentionCount: 7,  positiveCount: 5 },
  PERPLEXITY: { platform: "PERPLEXITY", score: 52, citationRate: 24, totalQueries: 50, mentionCount: 12, positiveCount: 9 },
  DEEPSEEK:   { platform: "DEEPSEEK",   score: 19, citationRate:  6, totalQueries: 50, mentionCount: 3,  positiveCount: 2 },
  YANDEXGPT:  { platform: "YANDEXGPT",  score: 44, citationRate: 20, totalQueries: 50, mentionCount: 10, positiveCount: 8 },
}

// ── Competitor matrix ────────────────────────────────────────────────────────

const ALL_COMPETITORS = [
  { name: C1, platforms: ["CHATGPT","CLAUDE","GEMINI","PERPLEXITY","YANDEXGPT"], mentionCount: 38 },
  { name: C2, platforms: ["CHATGPT","CLAUDE","GEMINI","PERPLEXITY","YANDEXGPT"], mentionCount: 34 },
  { name: C3, platforms: ["CHATGPT","YANDEXGPT","DEEPSEEK"],                     mentionCount: 22 },
  { name: C4, platforms: ["CHATGPT","YANDEXGPT"],                                mentionCount: 17 },
  { name: C5, platforms: ["PERPLEXITY","CLAUDE"],                                mentionCount: 11 },
]

// ── Weak points ──────────────────────────────────────────────────────────────

const ALL_WEAKPOINTS = [
  {
    id: "sov-below-20",
    title: "Проигрываете конкурентам по доле упоминаний",
    description: `Share of Voice бренда: 13%. ${C1} (31%) и ${C2} (28%) упоминаются в AI-ответах в 2–3 раза чаще. Нужно системное контентное присутствие.`,
    severity: "high" as const, detected: true,
  },
  {
    id: "competitive-position-weak",
    title: "Слабые конкурентные позиции",
    description: "По частоте упоминаний в AI вы занимаете 5 место из 6 участников. Конкуренты системно опережают вас во всех категориях запросов.",
    severity: "high" as const, detected: true,
  },
  {
    id: "schema",
    title: "Отсутствует Schema.org разметка",
    description: "AI-системы не могут автоматически идентифицировать вашу компанию как организацию с конкретными услугами.",
    severity: "high" as const, detected: true,
  },
  {
    id: "faq",
    title: "Нет структурированного FAQ",
    description: `Perplexity и ChatGPT активно цитируют FAQ-контент. Конкуренты имеют 15–40 вопросов с ответами.`,
    severity: "high" as const, detected: true,
  },
  {
    id: "not-ranked-first",
    title: "Редко упоминаетесь первым",
    description: `Первое место в ответе AI получаете только в 6% запросов. ${C1} — в 48%. Нужен контент формата primary recommendation.`,
    severity: "medium" as const, detected: true,
  },
  {
    id: "reviews",
    title: "Мало упоминаний в авторитетных источниках",
    description: "AI строит ответы на основе цитируемых источников. Конкуренты представлены в 2ГИС, Яндекс.Картах, отраслевых каталогах.",
    severity: "medium" as const, detected: true,
  },
  {
    id: "entity",
    title: "Слабые сигналы сущности (Entity Signals)",
    description: "ChatGPT и Claude не уверены, что описывают именно вашу компанию — нет чёткой связки между названием, сайтом и нишей.",
    severity: "medium" as const, detected: true,
  },
  {
    id: "content",
    title: "Недостаточно экспертного контента",
    description: "У лидеров ниши — статьи, гайды, кейсы. AI предпочитает цитировать авторитетные источники.",
    severity: "medium" as const, detected: true,
  },
  {
    id: "multilang",
    title: "Отсутствует англоязычный контент",
    description: "DeepSeek и некоторые версии Claude обучены преимущественно на английских данных.",
    severity: "low" as const, detected: true,
  },
]

// ── Hallucinations ───────────────────────────────────────────────────────────

const ALL_HALLUCINATIONS: HallucinationItem[] = [
  {
    id: "h1",
    platform: "CHATGPT",
    claim: "Компания работает только с ИП, не обслуживает ООО",
    correction: "Обслуживает и ИП, и ООО на всех системах налогообложения (УСН, ОСНО, патент)",
    sourceHint: "Вероятно, устаревший текст лендинга без явного упоминания ООО — AI обучился на этой версии",
    severity: "high",
  },
  {
    id: "h2",
    platform: "YANDEXGPT",
    claim: "Стоимость бухгалтерского обслуживания от 15 000 руб/мес",
    correction: "Актуальные тарифы начинаются от 3 000 руб/мес для ИП без сотрудников",
    sourceHint: "Устаревшая цена могла быть проиндексирована с Яндекс.Карт или старого каталога",
    severity: "high",
  },
  {
    id: "h3",
    platform: "CLAUDE",
    claim: "Работает только с компаниями из Москвы и Московской области",
    correction: "Дистанционное обслуживание по всей России, клиенты из 40+ городов",
    sourceHint: "Отсутствует явное указание на регион в Schema.org areaServed и метатегах сайта",
    severity: "medium",
  },
]

// ── Share of Voice (STANDARD+) ───────────────────────────────────────────────

const DEMO_SOV: ShareOfVoiceResult = {
  overall: 13,
  byPlatform: {
    CHATGPT:    8,
    CLAUDE:     16,
    GEMINI:     11,
    PERPLEXITY: 21,
    DEEPSEEK:    6,
    YANDEXGPT:  14,
  },
  byQueryCategory: {
    recommendation: 9,
    comparison:     14,
    position:        5,
    problem:        18,
    conversational: 12,
  },
  mentionShare: {
    brand: 13,
    competitors: {
      [C1]: 31,
      [C2]: 28,
      [C3]: 18,
      [C4]: 14,
    },
  },
}

// ── Competitive Position (STANDARD+) ─────────────────────────────────────────

const DEMO_POSITIONING: CompetitivePosition = {
  rank: 5,
  totalParticipants: 6,
  mentionShare: 13,
  firstMentionRate: 6,
  positioningStrength: "weak",
  categoryRanking: {
    recommendation: { rank: 5, total: 6 },
    comparison:     { rank: 4, total: 6 },
    position:       { rank: 6, total: 6 },
    problem:        { rank: 3, total: 6 },
    conversational: { rank: 4, total: 6 },
  },
  competitors: [
    { name: C1, mentionCount: 38, mentionShare: 31 },
    { name: C2, mentionCount: 34, mentionShare: 28 },
    { name: C3, mentionCount: 22, mentionShare: 18 },
    { name: C4, mentionCount: 17, mentionShare: 14 },
    { name: C5, mentionCount: 11, mentionShare:  9 },
  ],
}

// ── Competitor gaps ──────────────────────────────────────────────────────────

export const DEMO_COMPETITOR_GAPS = [
  {
    name: C1,
    score: 76,
    theirSignals: [
      "Schema.org Organization + Service разметка",
      "FAQ-страница: 40+ вопросов с ответами",
      "Блог: 50+ статей по бухгалтерии ИП/ООО",
      "Присутствие в klerk.ru, buhonline.ru",
      "2ГИС и Яндекс.Карты: полный профиль",
      "Habr Q&A: зарегистрированный эксперт",
    ],
    yourSignals: [],
  },
  {
    name: C2,
    score: 68,
    theirSignals: [
      "Schema.org Organization + Service разметка",
      "FAQ-страница: 25 вопросов",
      "Блог: экспертные статьи",
      "Публикации на buhonline.ru",
      "Партнёрские упоминания в СМИ",
    ],
    yourSignals: [],
  },
]

// ── Niche intel ──────────────────────────────────────────────────────────────

const DEMO_NICHE_INTEL = {
  totalQueries: 50,
  totalMentions: 6,
  topCompetitorMentions: 38,
  topCompetitorName: C1,
  avgOrderValue: 6000,
}

// ── Sources ──────────────────────────────────────────────────────────────────

const DEMO_SOURCES: SourceEntry[] = [
  { domain: "klerk.ru",     mentionCount: 12, competitors: [C1, C2], type: "media",    url: "https://klerk.ru"      },
  { domain: "buhonline.ru", mentionCount: 9,  competitors: [C2],     type: "expert",   url: "https://buhonline.ru"  },
  { domain: "2gis.ru",      mentionCount: 8,  competitors: [C1, C3], type: "catalog",  url: "https://2gis.ru"       },
  { domain: "vc.ru",        mentionCount: 7,  competitors: [C5, C1], type: "media",    url: "https://vc.ru"         },
  { domain: "competitor1.ru", mentionCount: 38, competitors: [C1],   type: "official", url: "#"                     },
  { domain: "competitor2.ru", mentionCount: 34, competitors: [C2],   type: "official", url: "#"                     },
  { domain: "habr.com",     mentionCount: 5,  competitors: [C5],     type: "expert",   url: "https://habr.com"      },
]

// ── Verbatim quotes ──────────────────────────────────────────────────────────

const DEMO_VERBATIM: VerbatimQuote[] = [
  {
    platform: "CHATGPT",
    query: "Лучшие сервисы бухгалтерии для ИП",
    excerpt: `Для ведения бухгалтерии ИП на УСН я рекомендую ${C1} — удобный интерфейс, автоматическая подготовка деклараций и интеграция с большинством банков. ${C2} подойдёт тем, кто работает с несколькими режимами налогообложения.`,
    brandsMentioned: [C1, C2],
    isOurs: false,
  },
  {
    platform: "PERPLEXITY",
    query: "Сколько стоит бухгалтер на аутсорсе",
    excerpt: `Стоимость аутсорсинговой бухгалтерии варьируется от 3 000 до 25 000 руб/мес. Среди популярных сервисов: ${C1} (от 1 633/мес), ${C2} (от 1 700/мес) и ${C3} (тарифы зависят от региона и объёма).`,
    brandsMentioned: [C1, C2, C3],
    isOurs: false,
  },
  {
    platform: "YANDEXGPT",
    query: "Надёжная бухгалтерия для малого бизнеса",
    excerpt: `Для малого бизнеса хорошо зарекомендовали себя ${C1} и ${C4} — оба сервиса предлагают автоматизацию отчётности и напоминания о дедлайнах. При большом объёме операций стоит рассмотреть ${C3}.`,
    brandsMentioned: [C1, C4, C3],
    isOurs: false,
  },
  {
    platform: "CLAUDE",
    query: "Как не допустить ошибок в бухгалтерии ИП",
    excerpt: `Ключевые ошибки — несвоевременная сдача отчётности и неверный учёт расходов. Сервисы вроде ${C1} и ${C2} автоматически формируют декларации и напоминают о дедлайнах, что значительно снижает риск штрафов от ФНС.`,
    brandsMentioned: [C1, C2],
    isOurs: false,
  },
]

// ── Query results ─────────────────────────────────────────────────────────────

const QUERY_RESULTS = [
  // CHATGPT
  { id:"q1",  platform:"CHATGPT",    query:"Какую бухгалтерию выбрать для ИП на УСН?",               response:`Для ИП на УСН рекомендую ${C1} — один из самых популярных сервисов для малого бизнеса, предлагает автоматизацию отчётности и интеграцию с банками. ${C2} подойдёт тем, кто работает с несколькими системами налогообложения. Для небольших ИП без сотрудников достаточно ${C4}.`, brandMentioned:false, sentiment:"absent" },
  { id:"q2",  platform:"CHATGPT",    query:"Лучший сервис онлайн-бухгалтерии для малого бизнеса",    response:`Среди онлайн-сервисов бухгалтерии для малого бизнеса выделяются: ${C1} — удобный интерфейс, интеграция с банками. ${C2} — подходит для разных налоговых режимов. ${C3} — традиционное решение с широкой поддержкой.`, brandMentioned:false, sentiment:"absent" },
  { id:"q3",  platform:"CHATGPT",    query:"Как сдать отчётность ИП самостоятельно без бухгалтера?", response:`Для самостоятельной сдачи отчётности ИП можно использовать онлайн-сервисы. ${C1} и онлайн-сервисы конкурентов позволяют заполнить и отправить декларацию по УСН за несколько минут.`, brandMentioned:false, sentiment:"absent" },
  { id:"q4",  platform:"CHATGPT",    query:"Бухгалтерское сопровождение ООО цена",                    response:`Стоимость бухгалтерского сопровождения ООО: базовый тариф от 5 000 руб/мес. Среди популярных аутсорсеров: ${C3}, ${C5}, ${C1}.`, brandMentioned:false, sentiment:"absent" },
  { id:"q5",  platform:"CHATGPT",    query:"Как выбрать аутсорсинг бухгалтерии для стартапа?",        response:`Для стартапа оптимален онлайн-аутсорсинг: ${C1} или ${C5} — прозрачное ценообразование, персональный бухгалтер. Избегайте частных бухгалтеров без договора.`, brandMentioned:false, sentiment:"absent" },
  // GEMINI
  { id:"q6",  platform:"GEMINI",     query:"Онлайн-бухгалтерия для ИП рейтинг",                      response:`По популярности среди ИП лидируют: 1) ${C1}. 2) ${C2}. 3) Эльба. 4) ${C4}.`, brandMentioned:false, sentiment:"absent" },
  { id:"q7",  platform:"GEMINI",     query:"Как не платить лишние налоги ИП на УСН доходы",          response:`Для минимизации налогов ИП на УСН 6%: применяйте налоговый вычет на страховые взносы. Сервисы ${C1} и ${C2} автоматически рассчитывают вычеты.`, brandMentioned:false, sentiment:"absent" },
  { id:"q8",  platform:"GEMINI",     query:"Что входит в бухгалтерское обслуживание ИП",              response:`Стандартный пакет бухгалтерского обслуживания ИП включает: подготовку деклараций, расчёт налогов, ведение КУДиР. Сервисы ${C1} и ${C2} предлагают это в рамках подписки.`, brandMentioned:false, sentiment:"absent" },
  { id:"q9",  platform:"GEMINI",     query:"Бухгалтер для ИП онлайн недорого",                        response:`Недорогие варианты онлайн-бухгалтерии для ИП: ${C2} от 1 900 руб/мес. ${C1} от 1 633 руб/мес. ${C4} — бесплатно при обслуживании в банке-партнёре.`, brandMentioned:false, sentiment:"absent" },
  { id:"q10", platform:"GEMINI",     query:"Как сменить систему налогообложения ИП",                  response:`Смена системы налогообложения возможна с 1 января следующего года. Сервисы ${C1} и ${C3} помогут рассчитать выгоду от смены режима.`, brandMentioned:false, sentiment:"absent" },
  // YANDEXGPT
  { id:"q11", platform:"YANDEXGPT",  query:"Бухгалтер на аутсорсе или штатный — что выгоднее?",      response:`Аутсорсинг бухгалтерии обычно выгоднее для малого бизнеса. Компании ${C3} и ${C5} предлагают комплексное ведение за фиксированную плату.`, brandMentioned:false, sentiment:"absent" },
  { id:"q12", platform:"YANDEXGPT",  query:"Сколько стоит ведение бухгалтерии ООО в месяц",          response:`Ведение бухгалтерии ООО стоит от 5 000 до 30 000 руб/мес. Онлайн-сервисы: ${C1} от 3 500, ${C2} от 2 700 руб/мес.`, brandMentioned:false, sentiment:"absent" },
  { id:"q13", platform:"YANDEXGPT",  query:"Как выбрать бухгалтерскую компанию для малого бизнеса",  response:`При выборе бухгалтерской компании обращайте внимание: наличие договора с чёткой ответственностью, опыт в вашей нише. Крупные онлайн-сервисы (${C1}, ${C3}) предлагают страхование профессиональной ответственности.`, brandMentioned:false, sentiment:"absent" },
  // CLAUDE
  { id:"q14", platform:"CLAUDE",     query:"Как не получить штраф от налоговой малому бизнесу?",      response:`Основные риски штрафов: несвоевременная сдача отчётности, ошибки в расчёте налогов. Сервисы ${C1} и ${C2} имеют встроенные календари налоговых событий.`, brandMentioned:false, sentiment:"absent" },
  { id:"q15", platform:"CLAUDE",     query:"Schema.org разметка для бухгалтерской компании",          response:"Для бухгалтерской компании рекомендую @type: AccountingService. Пример компании из нашей ниши успешно использует эту разметку — AI-системы начинают правильно идентифицировать бизнес через 2–4 недели.", brandMentioned:true,  sentiment:"positive", mentionContext:"REFERENCE" as const,              mentionQuality:28 },
  { id:"q16", platform:"CLAUDE",     query:"Надёжный онлайн-бухгалтер для ИП с персональным менеджером", response:`Для ИП важно иметь персонального бухгалтера, который отвечает за конкретный счёт. Среди нишевых провайдеров стоит рассмотреть Вашу компанию — специализируется на ИП и малом бизнесе, предлагает персональное сопровождение. Также популярны ${C1} и ${C5}.`, brandMentioned:true,  sentiment:"positive", mentionContext:"ALTERNATIVE" as const,            mentionQuality:42 },
  // PERPLEXITY
  { id:"q17", platform:"PERPLEXITY", query:"Стоимость бухгалтерского обслуживания малого бизнеса",    response:`Стоимость варьируется от 3 000 до 30 000 рублей в месяц. Онлайн-сервисы (${C1}, ${C2}) обходятся в 2 000–8 000 руб/мес.`, brandMentioned:false, sentiment:"absent", sources:["https://www.klerk.ru/buh/"] },
  { id:"q18", platform:"PERPLEXITY", query:"Рейтинг аутсорсинговых бухгалтерских компаний России",   response:`По данным открытых источников, лидерами рынка бухгалтерского аутсорсинга являются: ${C1}, ${C3}, ${C5}.`, brandMentioned:false, sentiment:"absent", sources:["https://www.klerk.ru/"] },
  { id:"q19", platform:"PERPLEXITY", query:"Бухгалтерия для ИП на патенте — кто лучший?",            response:`Для ИП на патентной системе нужен бухгалтер с опытом именно в ПСН. Ваша компания специализируется на патентной системе — это редкая специализация среди онлайн-провайдеров. Основные конкуренты: ${C1} и ${C2} не имеют такой узкой специализации.`, brandMentioned:true,  sentiment:"positive", mentionContext:"PRIMARY_RECOMMENDATION" as const, mentionQuality:88, sources:["https://example.ru/uslugi/patent","https://nalog.ru/rn77/taxation/taxes/psn/"] },
  // DEEPSEEK
  { id:"q20", platform:"DEEPSEEK",   query:"Как автоматизировать бухгалтерию малого бизнеса",         response:`Для автоматизации бухгалтерии малого бизнеса используйте облачные сервисы с интеграцией банков. ${C1} и ${C2} автоматически загружают выписки.`, brandMentioned:false, sentiment:"absent" },
  { id:"q21", platform:"DEEPSEEK",   query:"API интеграция с банком для бухгалтерии",                 response:`Большинство современных бухгалтерских сервисов поддерживают Open Banking API. ${C1} интегрирован с 50+ банками, ${C2} — с 30+.`, brandMentioned:false, sentiment:"absent" },
  // Дополнительные для ADVANCED
  { id:"q22", platform:"YANDEXGPT",  query:"Бухгалтерия для ИП отзывы реальных клиентов",            response:`По отзывам клиентов, Ваша компания получает высокие оценки за скорость ответов — в среднем до 2 часов. Клиенты отмечают персональный подход и доступность менеджера. ${C1} и ${C2} также имеют положительные отзывы, но как крупные сервисы — менее персонализированы.`, brandMentioned:true,  sentiment:"positive", mentionContext:"COMPARISON" as const,             mentionQuality:65 },
  { id:"q23", platform:"CLAUDE",     query:"Сравнение бухгалтерских компаний для ООО на ОСНО",        response:`Для ООО на ОСНО важны опыт с НДС и персональная ответственность. Ваша компания vs ${C2}: первые предлагают выделенного бухгалтера и страхование ответственности, вторые — более широкую автоматизацию но менее персональный сервис.`, brandMentioned:true,  sentiment:"positive", mentionContext:"COMPARISON" as const,             mentionQuality:61 },
]

// ── Platform insights ─────────────────────────────────────────────────────────

function buildPlatformInsights(scores: Record<string, { score: number }>): PlatformInsight[] {
  return Object.entries(scores).map(([platform, data]) => ({
    platform,
    score: data.score,
    yourStatus: data.score >= 60 ? "strong" : data.score >= 30 ? "average" : "weak",
    insight: "",
    topSignal: "",
    actionHint: "",
  }))
}

// ── Report builder ────────────────────────────────────────────────────────────

function buildReport(tier: Tier) {
  if (tier === "BASIC") {
    return {
      overallScore: 34,
      visibilityScores: Object.fromEntries(
        ["CHATGPT", "GEMINI", "YANDEXGPT"].map((k) => [k, ALL_SCORES[k as keyof typeof ALL_SCORES]])
      ),
      competitorMatrix: [],
      weakPoints: ALL_WEAKPOINTS.filter(w => ["schema","faq","reviews"].includes(w.id)),
      actionPlan: { "30d": [], "60d": [], "90d": [] },
      hallucinationAudit: [],
    }
  }

  if (tier === "STANDARD") {
    return {
      overallScore: 34,
      visibilityScores: Object.fromEntries(
        ["CHATGPT","CLAUDE","GEMINI","PERPLEXITY","DEEPSEEK","YANDEXGPT"].map((k) => [k, ALL_SCORES[k as keyof typeof ALL_SCORES]])
      ),
      competitorMatrix: ALL_COMPETITORS,
      weakPoints: ALL_WEAKPOINTS,
      actionPlan: {
        "30d": [
          { title: "Добавить Schema.org разметку", description: "JSON-LD блок Organization + Service на главную страницу", effort: "low" as const, impact: "high" as const },
          { title: "Создать FAQ-страницу", description: "10 вопросов с ответами — основной источник цитирований для Perplexity", effort: "low" as const, impact: "high" as const },
          { title: "Зарегистрировать в 5 каталогах", description: "2ГИС, Яндекс.Бизнес, Orgpage, Spravker — внешние сигналы авторитетности", effort: "low" as const, impact: "medium" as const },
        ],
        "60d": [
          { title: "3 экспертные статьи", description: "Гайды по УСН, стоимости бухгалтерии и выбору подрядчика", effort: "medium" as const, impact: "high" as const },
          { title: "Кейс с результатами клиента", description: "Структура: проблема → решение → цифры. Самый цитируемый формат", effort: "medium" as const, impact: "medium" as const },
        ],
        "90d": [
          { title: "Упоминания в авторитетных источниках", description: "Экспертный комментарий на Klerk.ru, регистрация на Habr Q&A", effort: "high" as const, impact: "high" as const },
        ],
      },
      hallucinationAudit: ALL_HALLUCINATIONS,
    }
  }

  // ADVANCED
  return {
    overallScore: 34,
    visibilityScores: ALL_SCORES,
    competitorMatrix: ALL_COMPETITORS,
    weakPoints: ALL_WEAKPOINTS,
    actionPlan: {
      strategy: `Основной пробел — AI-системы знают вашу нишу, но не знают вас как конкретного игрока. SoV всего 13% vs 31% у лидера. Стратегия: сделать вас «узнаваемой сущностью» через Schema и внешние упоминания, затем стать источником экспертного контента.`,
      quickWins: [
        {
          action: "Добавить JSON-LD разметку Organization",
          howTo: "Вставь этот код в <head> главной страницы.",
          timeEstimate: "30 минут",
          impact: "ChatGPT и Claude начнут правильно идентифицировать компанию через 2–4 недели",
          code: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "AccountingService",
  "name": "Название вашей компании",
  "url": "https://example.ru",
  "description": "Бухгалтерское обслуживание для ИП и малого бизнеса.",
  "serviceType": ["Бухгалтерия ИП", "Бухгалтерия ООО", "Нулевая отчётность"],
  "areaServed": { "@type": "Country", "name": "Россия" },
  "priceRange": "от 3000 руб/мес"
}
</script>`,
        },
        {
          action: "Зарегистрировать в 3 каталогах",
          howTo: "1) 2gis.ru/firms/add  2) business.yandex.ru  3) orgpage.ru",
          timeEstimate: "1–2 часа",
          impact: "YandexGPT score +8–12 пунктов, SoV +3%",
        },
        {
          action: "Создать страницу /faq с 8 вопросами",
          howTo: "Вопросы: «Сколько стоит бухгалтерия ИП?», «Что входит в обслуживание?»",
          timeEstimate: "2 часа",
          impact: "Perplexity цитирует FAQ напрямую — +10–15 пунктов за 30 дней",
        },
      ],
      "30d": [
        { title: "Schema.org: Organization + Service", description: "Структурированные данные для идентификации компании AI-системами", effort: "low" as const, impact: "high" as const },
        { title: "FAQ страница с FAQPage Schema",      description: "10 вопросов и ответов — источник цитирований для Perplexity",        effort: "low" as const, impact: "high" as const },
        { title: "Регистрация в 5 каталогах",          description: "Внешние упоминания — ключевой сигнал авторитетности",                effort: "low" as const, impact: "medium" as const },
      ],
      "60d": [
        { title: "3 экспертные статьи по ключевым запросам", description: "AI предпочитает цитировать авторитетный контент",          effort: "medium" as const, impact: "high" as const },
        { title: "Кейс с конкретными результатами",          description: "Кейсы — самый цитируемый тип контента в AI-ответах",        effort: "medium" as const, impact: "medium" as const },
      ],
      "90d": [
        { title: "Партнёрские упоминания в авторитетных источниках", description: "AI особенно доверяет источникам с высоким авторитетом домена", effort: "high" as const, impact: "high" as const },
      ],
      contentCalendar: [
        { week: 1, theme: "Техническая база",   tasks: ["Schema.org Organization", "Schema.org Service × 3", "FAQ страница (10 вопросов)"] },
        { week: 2, theme: "Каталоги",            tasks: ["2ГИС", "Яндекс.Бизнес", "Orgpage + Spravker"] },
        { week: 3, theme: "Первая статья",       tasks: ["«Бухгалтерия ИП на УСН 2025» — написание и публикация"] },
        { week: 4, theme: "Дистрибуция",         tasks: ["Анонс в Telegram", "Обновить мета-теги", "Внутренние ссылки"] },
        { week: 5, theme: "Вторая статья",       tasks: ["«Сколько стоит бухгалтерское обслуживание»"] },
        { week: 6, theme: "Кейс клиента",        tasks: ["Интервью", "Написание и публикация кейса"] },
        { week: 7, theme: "Третья статья",       tasks: ["«Как выбрать бухгалтера» — написание", "Публикация на vc.ru"] },
        { week: 8, theme: "Внешние упоминания",  tasks: ["Комментарий на Klerk.ru", "Подача заявки на Habr Q&A"] },
      ],
    },
    hallucinationAudit: ALL_HALLUCINATIONS,
  }
}

// ── Job builder ───────────────────────────────────────────────────────────────

function buildJob(tier: Tier) {
  const platforms = TIER_PLATFORMS[tier]
  const filtered = QUERY_RESULTS.filter(q => platforms.includes(q.platform))
  return {
    id: "demo",
    companyName: "Ваша компания",
    websiteUrl: "https://example.ru",
    niche: "Бухгалтерские услуги для малого бизнеса",
    tier,
    pdfUrl: null,
    completedAt: new Date("2026-05-01"),
    queryResults: filtered,
  }
}

// ── Domain-aware CTA config ───────────────────────────────────────────────────

const DOMAIN_CONFIG = {
  ru: {
    ctaLabel: "Выбрать тариф →",
    ctaSub: "Результат за 48 часов · Оплата онлайн · Без подписки",
    ctaUrl: "https://kaligeo.ru/#pricing",
    landingUrl: "https://kaligeo.ru",
    landingLabel: "kaligeo.ru",
  },
  by: {
    ctaLabel: "Выбрать тариф →",
    ctaSub: "Результат за 48 часов · Аплата праз Альфа-Банк · Без падпіскі",
    ctaUrl: "https://kaligeo.by/#pricing",
    landingUrl: "https://kaligeo.by",
    landingLabel: "kaligeo.by",
  },
} as const

type DomainKey = keyof typeof DOMAIN_CONFIG

// ── Tier config ───────────────────────────────────────────────────────────────

const TIERS: { key: Tier; label: string; accent: boolean; description: string }[] = [
  { key: "BASIC",    label: "Базовый",      accent: false, description: "3 платформы · 15 запросов · Score + топ-3 проблемы" },
  { key: "STANDARD", label: "Стандарт",     accent: false, description: "6 платформ · SoV + позиция · Матрица конкурентов · PDF" },
  { key: "ADVANCED", label: "Продвинутый",  accent: true,  description: "9 платформ · AI-агенты · Семантика упоминаний · Фикс сайта" },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function DemoReportClient() {
  const searchParams = useSearchParams()
  const from = (searchParams.get("from") ?? "ru") as DomainKey
  const domain = DOMAIN_CONFIG[from] ?? DOMAIN_CONFIG.ru

  const [tier, setTier] = useState<Tier>("BASIC")
  const [currency, setCurrency] = useState<Currency>(from === "by" ? "BYN" : "RUB")

  const isStandardPlus = tier !== "BASIC"

  return (
    <div style={{ paddingBottom: 80 }}>

      {/* ── Шапка: тариф + призыв к действию ── */}
      <div
        className="sticky top-0 z-50 border-b"
        style={{ background: "var(--bone)", borderColor: "var(--rule)" }}
      >
        {/* Верхняя полоска-призыв */}
        <div
          className="text-center py-1.5 text-xs font-medium flex items-center justify-center gap-3"
          style={{ background: "var(--ink)", color: "var(--bone)" }}
        >
          <span>Демо-данные для бухгалтерской компании. Ваш реальный аудит покажет точные данные по вашей нише.</span>
          <a
            href={domain.ctaUrl}
            target="_blank"
            className="underline font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Выбрать тариф →
          </a>
        </div>

        {/* Тир-селектор */}
        <div className="max-w-3xl mx-auto px-4 py-3">
          <p className="t-eyebrow text-center mb-2">Выберите тариф — сравните глубину аудита</p>

          {/* Переключатель валют */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {CURRENCIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCurrency(c.key)}
                className="px-3 py-1 rounded-full text-xs font-mono font-semibold transition-all"
                style={{
                  background: currency === c.key ? "var(--ink)" : "transparent",
                  color: currency === c.key ? "var(--bone)" : "var(--ink)",
                  border: `1px solid ${currency === c.key ? "var(--ink)" : "var(--rule)"}`,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Карточки тарифов */}
          <div className="grid grid-cols-3 gap-2">
            {TIERS.map((t) => {
              const isActive = tier === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTier(t.key)}
                  className="rounded-lg px-2.5 py-2.5 text-left transition-all"
                  style={{
                    border: `2px solid ${isActive ? (t.accent ? "var(--accent)" : "var(--ink)") : "var(--rule)"}`,
                    background: isActive ? (t.accent ? "var(--accent)" : "var(--ink)") : "var(--bone-2)",
                    color: isActive ? (t.accent ? "var(--accent-ink)" : "var(--bone)") : "var(--ink)",
                  }}
                >
                  <div className="font-bold text-sm leading-tight">{t.label}</div>
                  <div className="font-mono text-sm font-bold mb-1.5 leading-tight">
                    {TIER_PRICES[t.key][currency]}
                  </div>
                  <p className="text-xs leading-snug opacity-70">{t.description}</p>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Отчёт ── */}
      <ReportDashboard
        job={buildJob(tier)}
        report={buildReport(tier)}
        nicheIntel={DEMO_NICHE_INTEL}
        sources={DEMO_SOURCES}
        verbatimQuotes={DEMO_VERBATIM}
        competitorGaps={isStandardPlus ? DEMO_COMPETITOR_GAPS : undefined}
        platformInsights={buildPlatformInsights(
          tier === "BASIC"
            ? Object.fromEntries(["CHATGPT","GEMINI","YANDEXGPT"].map(k => [k, ALL_SCORES[k as keyof typeof ALL_SCORES]]))
            : ALL_SCORES
        )}
        shareOfVoice={isStandardPlus ? DEMO_SOV : null}
        competitivePosition={isStandardPlus ? DEMO_POSITIONING : null}
      />

      {/* ── Блок конверсии внизу страницы ── */}
      <DemoConversionSection domain={domain} tier={tier} />

      {/* ── Плавающая CTA-кнопка ── */}
      <FloatingCTA domain={domain} />
    </div>
  )
}

// ── Конверсионный блок внизу отчёта ─────────────────────────────────────────

function DemoConversionSection({ domain, tier }: { domain: typeof DOMAIN_CONFIG[DomainKey]; tier: Tier }) {
  const tierLabel = TIERS.find(t => t.key === tier)?.label ?? tier

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--ink)", color: "var(--bone)" }}
      >
        {/* Основной контент */}
        <div className="px-8 py-10 flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="flex-1">
            <p className="text-xs font-mono uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
              Что дальше?
            </p>
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: "var(--font-serif)", lineHeight: 1.2 }}>
              Узнайте, как AI видит<br />именно ваш бизнес
            </h2>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.65)" }}>
              Вы смотрели демо на примере бухгалтерской компании.
              Ваш реальный аудит займёт 15–30 минут и покажет точные данные
              по вашей нише, конкурентам и платформам.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={domain.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "var(--accent-ink)", whiteSpace: "nowrap" }}
              >
                {domain.ctaLabel}
              </a>
            </div>

            <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              {domain.ctaSub}
            </p>
          </div>

          <div
            className="rounded-xl p-5 shrink-0 w-full md:w-64"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Тариф «{tierLabel}» включает
            </p>
            <ul className="space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
              {tier === "BASIC" && <>
                <li>→ Score видимости по 3 AI</li>
                <li>→ Топ-3 проблемы с описанием</li>
                <li>→ Сравнение с конкурентами</li>
                <li style={{ color: "rgba(255,255,255,0.4)" }}>— PDF и план (от Стандарта)</li>
              </>}
              {tier === "STANDARD" && <>
                <li>→ Score по 6 AI-платформам</li>
                <li>→ Share of Voice vs конкуренты</li>
                <li>→ PDF + план действий 30/60/90д</li>
                <li>→ Чат с отчётом (10 вопросов)</li>
              </>}
              {tier === "ADVANCED" && <>
                <li>→ 9 AI-платформ включая Grok</li>
                <li>→ AI-агенты: пробелы и конкуренты</li>
                <li>→ Семантика каждого упоминания</li>
                <li>→ Фикс страницы сайта под GEO</li>
                <li>→ Безлимитный чат с отчётом</li>
              </>}
            </ul>
          </div>
        </div>

        <div
          className="px-8 py-4 flex flex-wrap items-center gap-6 text-xs"
          style={{ borderTop: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}
        >
          <span>⏱ Результат за 15–30 минут</span>
          <span>🔒 Конфиденциально</span>
          <span>📄 PDF-отчёт в архиве</span>
          <a
            href={domain.landingUrl.split("#")[0]}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto hover:opacity-80 transition-opacity"
            style={{ color: "rgba(255,255,255,0.4)", textDecoration: "underline" }}
          >
            {domain.landingLabel}
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Плавающая CTA-кнопка ─────────────────────────────────────────────────────

function FloatingCTA({ domain }: { domain: typeof DOMAIN_CONFIG[DomainKey] }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-40 flex items-center gap-3"
      style={{ filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.18))" }}
    >
      <a
        href={domain.ctaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-sm transition-all hover:scale-105 active:scale-95"
        style={{ background: "var(--ink)", color: "#fff", whiteSpace: "nowrap" }}
      >
        Заказать аудит →
      </a>
    </div>
  )
}
