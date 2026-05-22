"use client"

import { useState } from "react"
import { ReportDashboard } from "@/components/report/ReportDashboard"
import type { HallucinationItem } from "@/components/report/HallucinationAudit"
import type { SourceEntry } from "@/components/report/SourceAuthority"
import type { VerbatimQuote } from "@/components/report/VerbatimInsights"
import type { PlatformInsight } from "@/components/report/PlatformIntelligence"
import type { ShareOfVoiceResult } from "@/lib/analysis/share-of-voice"
import type { CompetitivePosition } from "@/lib/analysis/competitive-positioning"

type Tier = "BASIC" | "STANDARD" | "ADVANCED"

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
  { name: "Моё дело",           platforms: ["CHATGPT","CLAUDE","GEMINI","PERPLEXITY","YANDEXGPT"], mentionCount: 38 },
  { name: "Контур.Бухгалтерия", platforms: ["CHATGPT","CLAUDE","GEMINI","PERPLEXITY","YANDEXGPT"], mentionCount: 34 },
  { name: "1С:БухОбслуживание", platforms: ["CHATGPT","YANDEXGPT","DEEPSEEK"],                     mentionCount: 22 },
  { name: "СберБухгалтерия",    platforms: ["CHATGPT","YANDEXGPT"],                                mentionCount: 17 },
  { name: "Финолог",            platforms: ["PERPLEXITY","CLAUDE"],                                mentionCount: 11 },
]

// ── Weak points ──────────────────────────────────────────────────────────────

const ALL_WEAKPOINTS = [
  {
    id: "sov-below-20",
    title: "Проигрываете конкурентам по доле упоминаний",
    description: "Share of Voice бренда: 13%. Моё дело (31%) и Контур (28%) упоминаются в AI-ответах в 2–3 раза чаще. Нужно системное контентное присутствие.",
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
    description: "Perplexity и ChatGPT активно цитируют FAQ-контент. Конкуренты имеют 15–40 вопросов с ответами.",
    severity: "high" as const, detected: true,
  },
  {
    id: "not-ranked-first",
    title: "Редко упоминаетесь первым",
    description: "Первое место в ответе AI получаете только в 6% запросов. Моё дело — в 48%. Нужен контент формата primary recommendation.",
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
      "Моё дело":           31,
      "Контур.Бухгалтерия": 28,
      "1С:БухОбслуживание": 18,
      "СберБухгалтерия":    14,
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
    { name: "Моё дело",           mentionCount: 38, mentionShare: 31 },
    { name: "Контур.Бухгалтерия", mentionCount: 34, mentionShare: 28 },
    { name: "1С:БухОбслуживание", mentionCount: 22, mentionShare: 18 },
    { name: "СберБухгалтерия",    mentionCount: 17, mentionShare: 14 },
    { name: "Финолог",            mentionCount: 11, mentionShare:  9 },
  ],
}

// ── Competitor gaps ──────────────────────────────────────────────────────────

export const DEMO_COMPETITOR_GAPS = [
  {
    name: "Моё дело",
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
    name: "Контур.Бухгалтерия",
    score: 68,
    theirSignals: [
      "Schema.org Organization + Service разметка",
      "FAQ-страница: 25 вопросов",
      "Блог на kontur.ru: экспертные статьи",
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
  topCompetitorName: "Моё дело",
  avgOrderValue: 6000,
}

// ── Sources ──────────────────────────────────────────────────────────────────

const DEMO_SOURCES: SourceEntry[] = [
  { domain: "klerk.ru",     mentionCount: 12, competitors: ["Моё дело", "Контур.Бухгалтерия"],         type: "media",    url: "https://klerk.ru"      },
  { domain: "buhonline.ru", mentionCount: 9,  competitors: ["Контур.Бухгалтерия"],                     type: "expert",   url: "https://buhonline.ru"  },
  { domain: "2gis.ru",      mentionCount: 8,  competitors: ["Моё дело", "1С:БухОбслуживание"],         type: "catalog",  url: "https://2gis.ru"       },
  { domain: "vc.ru",        mentionCount: 7,  competitors: ["Финолог", "Моё дело"],                    type: "media",    url: "https://vc.ru"         },
  { domain: "moe-delo.com", mentionCount: 38, competitors: ["Моё дело"],                               type: "official", url: "https://moe-delo.com"  },
  { domain: "kontur.ru",    mentionCount: 34, competitors: ["Контур.Бухгалтерия"],                     type: "official", url: "https://kontur.ru"     },
  { domain: "habr.com",     mentionCount: 5,  competitors: ["Финолог"],                                type: "expert",   url: "https://habr.com"      },
]

// ── Verbatim quotes ──────────────────────────────────────────────────────────

const DEMO_VERBATIM: VerbatimQuote[] = [
  {
    platform: "CHATGPT",
    query: "Лучшие сервисы бухгалтерии для ИП",
    excerpt: "Для ведения бухгалтерии ИП на УСН я рекомендую Моё дело — удобный интерфейс, автоматическая подготовка деклараций и интеграция с большинством банков. Контур.Бухгалтерия подойдёт тем, кто работает с несколькими режимами налогообложения.",
    brandsMentioned: ["Моё дело", "Контур.Бухгалтерия"],
    isOurs: false,
  },
  {
    platform: "PERPLEXITY",
    query: "Сколько стоит бухгалтер на аутсорсе",
    excerpt: "Стоимость аутсорсинговой бухгалтерии варьируется от 3 000 до 25 000 руб/мес. Среди популярных сервисов: Моё дело (от 1 633/мес), Контур.Бухгалтерия (от 1 700/мес) и 1С:БухОбслуживание (тарифы зависят от региона и объёма).",
    brandsMentioned: ["Моё дело", "Контур.Бухгалтерия", "1С:БухОбслуживание"],
    isOurs: false,
  },
  {
    platform: "YANDEXGPT",
    query: "Надёжная бухгалтерия для малого бизнеса",
    excerpt: "Для малого бизнеса хорошо зарекомендовали себя Моё дело и СберБухгалтерия — оба сервиса предлагают автоматизацию отчётности и напоминания о дедлайнах. При большом объёме операций стоит рассмотреть 1С:БухОбслуживание.",
    brandsMentioned: ["Моё дело", "СберБухгалтерия", "1С:БухОбслуживание"],
    isOurs: false,
  },
  {
    platform: "CLAUDE",
    query: "Как не допустить ошибок в бухгалтерии ИП",
    excerpt: "Ключевые ошибки — несвоевременная сдача отчётности и неверный учёт расходов. Сервисы вроде Моё дело и Контур.Бухгалтерия автоматически формируют декларации и напоминают о дедлайнах, что значительно снижает риск штрафов от ФНС.",
    brandsMentioned: ["Моё дело", "Контур.Бухгалтерия"],
    isOurs: false,
  },
]

// ── Query results ─────────────────────────────────────────────────────────────
// mentionContext + mentionQuality добавлены для запросов где brandMentioned: true

const QUERY_RESULTS = [
  // CHATGPT
  { id:"q1",  platform:"CHATGPT",    query:"Какую бухгалтерию выбрать для ИП на УСН?",               response:"Для ИП на УСН рекомендую Моё дело — один из самых популярных сервисов для малого бизнеса, предлагает автоматизацию отчётности и интеграцию с банками. Контур.Бухгалтерия подойдёт тем, кто работает с несколькими системами налогообложения. Для небольших ИП без сотрудников достаточно СберБухгалтерии.", brandMentioned:false, sentiment:"absent" },
  { id:"q2",  platform:"CHATGPT",    query:"Лучший сервис онлайн-бухгалтерии для малого бизнеса",    response:"Среди онлайн-сервисов бухгалтерии для малого бизнеса выделяются: Моё дело — удобный интерфейс, интеграция с банками. Контур.Бухгалтерия — подходит для разных налоговых режимов. 1С:БухОбслуживание — традиционное решение с широкой поддержкой.", brandMentioned:false, sentiment:"absent" },
  { id:"q3",  platform:"CHATGPT",    query:"Как сдать отчётность ИП самостоятельно без бухгалтера?", response:"Для самостоятельной сдачи отчётности ИП можно использовать онлайн-сервисы. Моё дело и Контур.Эльба позволяют заполнить и отправить декларацию по УСН за несколько минут.", brandMentioned:false, sentiment:"absent" },
  { id:"q4",  platform:"CHATGPT",    query:"Бухгалтерское сопровождение ООО цена",                    response:"Стоимость бухгалтерского сопровождения ООО: базовый тариф от 5 000 руб/мес. Среди популярных аутсорсеров: 1С:БухОбслуживание, Финолог, Моё дело.", brandMentioned:false, sentiment:"absent" },
  { id:"q5",  platform:"CHATGPT",    query:"Как выбрать аутсорсинг бухгалтерии для стартапа?",        response:"Для стартапа оптимален онлайн-аутсорсинг: Моё дело Бюро или Финолог — прозрачное ценообразование, персональный бухгалтер. Избегайте частных бухгалтеров без договора.", brandMentioned:false, sentiment:"absent" },
  // GEMINI
  { id:"q6",  platform:"GEMINI",     query:"Онлайн-бухгалтерия для ИП рейтинг",                      response:"По популярности среди ИП лидируют: 1) Моё дело. 2) Контур.Бухгалтерия. 3) Эльба. 4) СберБухгалтерия.", brandMentioned:false, sentiment:"absent" },
  { id:"q7",  platform:"GEMINI",     query:"Как не платить лишние налоги ИП на УСН доходы",          response:"Для минимизации налогов ИП на УСН 6%: применяйте налоговый вычет на страховые взносы. Сервисы Моё дело и Контур.Бухгалтерия автоматически рассчитывают вычеты.", brandMentioned:false, sentiment:"absent" },
  { id:"q8",  platform:"GEMINI",     query:"Что входит в бухгалтерское обслуживание ИП",              response:"Стандартный пакет бухгалтерского обслуживания ИП включает: подготовку деклараций, расчёт налогов, ведение КУДиР. Сервисы Моё дело и Контур предлагают это в рамках подписки.", brandMentioned:false, sentiment:"absent" },
  { id:"q9",  platform:"GEMINI",     query:"Бухгалтер для ИП онлайн недорого",                        response:"Недорогие варианты онлайн-бухгалтерии для ИП: Контур.Эльба от 1 900 руб/мес. Моё дело от 1 633 руб/мес. СберБухгалтерия — бесплатно при обслуживании в Сбере.", brandMentioned:false, sentiment:"absent" },
  { id:"q10", platform:"GEMINI",     query:"Как сменить систему налогообложения ИП",                  response:"Смена системы налогообложения возможна с 1 января следующего года. Сервисы Моё дело и 1С помогут рассчитать выгоду от смены режима.", brandMentioned:false, sentiment:"absent" },
  // YANDEXGPT
  { id:"q11", platform:"YANDEXGPT",  query:"Бухгалтер на аутсорсе или штатный — что выгоднее?",      response:"Аутсорсинг бухгалтерии обычно выгоднее для малого бизнеса. Компании 1С:БухОбслуживание и Финолог предлагают комплексное ведение за фиксированную плату.", brandMentioned:false, sentiment:"absent" },
  { id:"q12", platform:"YANDEXGPT",  query:"Сколько стоит ведение бухгалтерии ООО в месяц",          response:"Ведение бухгалтерии ООО стоит от 5 000 до 30 000 руб/мес. Онлайн-сервисы: Моё дело от 3 500, Контур.Бухгалтерия от 2 700 руб/мес.", brandMentioned:false, sentiment:"absent" },
  { id:"q13", platform:"YANDEXGPT",  query:"Как выбрать бухгалтерскую компанию для малого бизнеса",  response:"При выборе бухгалтерской компании обращайте внимание: наличие договора с чёткой ответственностью, опыт в вашей нише. Крупные онлайн-сервисы (Моё дело, 1С) предлагают страхование профессиональной ответственности.", brandMentioned:false, sentiment:"absent" },
  // CLAUDE
  { id:"q14", platform:"CLAUDE",     query:"Как не получить штраф от налоговой малому бизнесу?",      response:"Основные риски штрафов: несвоевременная сдача отчётности, ошибки в расчёте налогов. Сервисы Моё дело и Контур.Бухгалтерия имеют встроенные календари налоговых событий.", brandMentioned:false, sentiment:"absent" },
  { id:"q15", platform:"CLAUDE",     query:"Schema.org разметка для бухгалтерской компании",          response:"Для бухгалтерской компании рекомендую @type: AccountingService. Пример компании из нашей ниши успешно использует эту разметку — AI-системы начинают правильно идентифицировать бизнес через 2–4 недели.", brandMentioned:true,  sentiment:"positive", mentionContext:"REFERENCE" as const,              mentionQuality:28 },
  { id:"q16", platform:"CLAUDE",     query:"Надёжный онлайн-бухгалтер для ИП с персональным менеджером", response:"Для ИП важно иметь персонального бухгалтера, который отвечает за конкретный счёт. Среди нишевых провайдеров стоит рассмотреть Пример компании — специализируется на ИП и малом бизнесе, предлагает персональное сопровождение. Также популярны Моё дело Бюро и Финолог.", brandMentioned:true,  sentiment:"positive", mentionContext:"ALTERNATIVE" as const,            mentionQuality:42 },
  // PERPLEXITY
  { id:"q17", platform:"PERPLEXITY", query:"Стоимость бухгалтерского обслуживания малого бизнеса",    response:"Стоимость варьируется от 3 000 до 30 000 рублей в месяц. Онлайн-сервисы (Моё дело, Контур.Бухгалтерия) обходятся в 2 000–8 000 руб/мес.", brandMentioned:false, sentiment:"absent", sources:["https://www.klerk.ru/buh/","https://moe-delo.com/ceny/","https://kontur.ru/buhgalteriya/ceny"] },
  { id:"q18", platform:"PERPLEXITY", query:"Рейтинг аутсорсинговых бухгалтерских компаний России",   response:"По данным открытых источников, лидерами рынка бухгалтерского аутсорсинга являются: Моё дело Бюро, 1С:БухОбслуживание, Финолог.", brandMentioned:false, sentiment:"absent", sources:["https://www.klerk.ru/","https://moe-delo.com/buro/"] },
  { id:"q19", platform:"PERPLEXITY", query:"Бухгалтерия для ИП на патенте — кто лучший?",            response:"Для ИП на патентной системе нужен бухгалтер с опытом именно в ПСН. Пример компании специализируется на патентной системе — это редкая специализация среди онлайн-провайдеров. Основные конкуренты: Моё дело и Контур не имеют такой узкой специализации.", brandMentioned:true,  sentiment:"positive", mentionContext:"PRIMARY_RECOMMENDATION" as const, mentionQuality:88, sources:["https://example.ru/uslugi/patent","https://nalog.ru/rn77/taxation/taxes/psn/"] },
  // DEEPSEEK
  { id:"q20", platform:"DEEPSEEK",   query:"Как автоматизировать бухгалтерию малого бизнеса",         response:"Для автоматизации бухгалтерии малого бизнеса используйте облачные сервисы с интеграцией банков. Моё дело и Контур.Бухгалтерия автоматически загружают выписки.", brandMentioned:false, sentiment:"absent" },
  { id:"q21", platform:"DEEPSEEK",   query:"API интеграция с банком для бухгалтерии",                 response:"Большинство современных бухгалтерских сервисов поддерживают Open Banking API. Моё дело интегрировано с 50+ банками, Контур.Бухгалтерия — с 30+.", brandMentioned:false, sentiment:"absent" },
  // Дополнительные для ADVANCED — демонстрируем разные типы контекста
  { id:"q22", platform:"YANDEXGPT",  query:"Бухгалтерия для ИП отзывы реальных клиентов",            response:"По отзывам клиентов, Пример компании получает высокие оценки за скорость ответов — в среднем до 2 часов. Клиенты отмечают персональный подход и доступность менеджера. Моё дело и Контур также имеют положительные отзывы, но как крупные сервисы — менее персонализированы.", brandMentioned:true,  sentiment:"positive", mentionContext:"COMPARISON" as const,             mentionQuality:65 },
  { id:"q23", platform:"CLAUDE",     query:"Сравнение бухгалтерских компаний для ООО на ОСНО",        response:"Для ООО на ОСНО важны опыт с НДС и персональная ответственность. Пример компании vs Контур.Бухгалтерия: первые предлагают выделенного бухгалтера и страхование ответственности, вторые — более широкую автоматизацию но менее персональный сервис.", brandMentioned:true,  sentiment:"positive", mentionContext:"COMPARISON" as const,             mentionQuality:61 },
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
      strategy: "Основной пробел — AI-системы знают вашу нишу, но не знают вас как конкретного игрока. SoV всего 13% vs 31% у лидера. Стратегия: сделать вас «узнаваемой сущностью» через Schema и внешние упоминания, затем стать источником экспертного контента.",
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
    companyName: "Пример компании",
    websiteUrl: "https://example.ru",
    niche: "Бухгалтерские услуги для малого бизнеса",
    tier,
    pdfUrl: null,
    completedAt: new Date("2026-05-01"),
    queryResults: filtered,
  }
}

// ── Tier selector config ──────────────────────────────────────────────────────

const TIERS: { key: Tier; label: string; price: string; accent: boolean; description: string }[] = [
  { key: "BASIC",    label: "Базовый",    price: "4 900 ₽",  accent: false, description: "3 платформы · 15 запросов · Score + топ-3 проблемы" },
  { key: "STANDARD", label: "Стандарт",  price: "13 900 ₽", accent: false, description: "6 платформ · SoV + позиция · Матрица конкурентов · PDF" },
  { key: "ADVANCED", label: "Продвинутый", price: "27 900 ₽", accent: true, description: "9 платформ · AI-агенты · Семантика упоминаний · Фикс сайта" },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function DemoReportClient() {
  const [tier, setTier] = useState<Tier>("ADVANCED")

  const isStandardPlus = tier !== "BASIC"

  return (
    <div>
      {/* Demo banner */}
      <div
        className="text-center py-2 text-xs font-medium"
        style={{ background: "var(--ink)", color: "var(--bone)" }}
      >
        Демо-отчёт · Данные примерные · Реальные результаты индивидуальны
      </div>

      {/* Tier selector */}
      <div
        className="sticky top-0 z-50 border-b"
        style={{ background: "var(--bone)", borderColor: "var(--rule)" }}
      >
        <div className="max-w-3xl mx-auto px-4 py-4">
          <p className="t-eyebrow text-center mb-3">Выберите тариф — сравните глубину аудита</p>
          <div className="grid grid-cols-3 gap-3">
            {TIERS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTier(t.key)}
                className="rounded-lg px-3 py-3 text-left transition-all"
                style={{
                  border: `2px solid ${tier === t.key ? (t.accent ? "var(--accent)" : "var(--ink)") : "var(--rule)"}`,
                  background: tier === t.key ? (t.accent ? "var(--accent)" : "var(--ink)") : "var(--bone-2)",
                  color: tier === t.key ? (t.accent ? "var(--accent-ink)" : "var(--bone)") : "var(--ink)",
                }}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <span className="font-bold text-sm">{t.label}</span>
                  <span className="font-mono text-sm font-bold">{t.price}</span>
                </div>
                <p className="text-xs leading-snug opacity-70">{t.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

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
    </div>
  )
}
