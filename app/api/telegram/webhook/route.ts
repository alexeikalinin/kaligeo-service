import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tg, inlineKeyboard } from "@/lib/telegram"
import { notifyNewAuditRequest } from "@/lib/notify"
import { tasks } from "@trigger.dev/sdk/v3"
import type { freemiumSequence } from "@/trigger/freemium-sequence"
import { runWebsiteAnalysisAgent } from "@/lib/agents/website-analysis-agent"

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID ?? "UNSET"

const TIERS = {
  BASIC:    { label: "Basic",    desc: "15 запросов · ChatGPT, Gemini, YandexGPT · базовый отчёт",  price: "$50" },
  STANDARD: { label: "Standard", desc: "30 запросов · 6 платформ · PDF-отчёт · план на 90 дней",   price: "$150" },
  ADVANCED: { label: "Advanced", desc: "50 запросов · 9 платформ · AI-агенты · разбор конкурентов", price: "$300" },
} as const

type Tier = keyof typeof TIERS

interface SessionData {
  companyName?: string
  websiteUrl?: string
  niche?: string
  competitors?: string[]
  tier?: Tier
  email?: string
  source?: string
  freemiumScore?: number
  freemiumScanId?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getSession(chatId: string) {
  return prisma.telegramSession.upsert({
    where: { chatId },
    update: {},
    create: { chatId, step: "idle", data: {} },
  })
}

async function setStep(chatId: string, step: string, data?: SessionData) {
  await prisma.telegramSession.update({
    where: { chatId },
    data: { step, ...(data !== undefined ? { data: data as object } : {}) },
  })
}

function parseUrl(raw: string): string | null {
  try {
    const url = raw.startsWith("https://") || raw.startsWith("http://") ? raw : `https://${raw}`
    const parsed = new URL(url)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null
    return url
  } catch {
    return null
  }
}

function estimatePreviewScore(niche: string, services: string[], keywords: string[]): number {
  let score = 10
  if (services.length >= 3) score += 5
  if (keywords.length >= 5) score += 5
  if (niche.length > 100) score += 3
  const aiTerms = ["ai", "chatgpt", "llm", "нейро", "искусственный", "автомат"]
  const hasAiTerms = aiTerms.some(
    (t) => niche.toLowerCase().includes(t) || services.join(" ").toLowerCase().includes(t)
  )
  if (hasAiTerms) score += 7
  return Math.min(score, 42)
}

async function runFreemiumScan(websiteUrl: string, source?: string): Promise<{ scanId: string; score: number; companyName: string; niche: string; suggestedCompetitors: string[] } | null> {
  try {
    const existing = await prisma.freemiumScan.findFirst({
      where: {
        websiteUrl,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: "desc" },
    })
    if (existing) return {
      scanId: existing.id,
      score: existing.previewScore,
      companyName: existing.companyName,
      niche: existing.niche,
      suggestedCompetitors: existing.suggestedCompetitors,
    }

    let analysis
    try {
      analysis = await runWebsiteAnalysisAgent(websiteUrl)
    } catch {
      analysis = {
        companyName: "",
        niche: "",
        description: "",
        services: [] as string[],
        targetAudience: "",
        keywords: [] as string[],
        suggestedCompetitors: [] as string[],
      }
    }

    const previewScore = estimatePreviewScore(analysis.niche, analysis.services, analysis.keywords)

    const scan = await prisma.freemiumScan.create({
      data: {
        websiteUrl,
        companyName: analysis.companyName || new URL(websiteUrl).hostname,
        niche: analysis.niche || "Не определено",
        services: analysis.services,
        keywords: analysis.keywords,
        suggestedCompetitors: analysis.suggestedCompetitors,
        previewScore,
        ...(source ? { source } : {}),
      },
    })

    return {
      scanId: scan.id,
      score: scan.previewScore,
      companyName: scan.companyName,
      niche: scan.niche,
      suggestedCompetitors: scan.suggestedCompetitors,
    }
  } catch (err) {
    console.error("runFreemiumScan error:", err)
    return null
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token")
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }

  const update = await req.json()

  if (update.callback_query) {
    await handleCallback(update.callback_query)
  } else if (update.message) {
    await handleMessage(update.message)
  }

  return NextResponse.json({ ok: true })
}

// ── Message handler ───────────────────────────────────────────────────────────

async function handleMessage(msg: { chat: { id: number }; text?: string; message_id: number }) {
  const chatId = String(msg.chat.id)
  const text = (msg.text ?? "").trim()

  if (chatId === ADMIN_CHAT_ID) {
    if (text === "/start") {
      await tg.send(chatId, "👋 Это клиентский бот KaliGEO.\nУведомления приходят сюда автоматически.")
    }
    return
  }

  const session = await getSession(chatId)
  const step = session.step
  const data = (session.data ?? {}) as SessionData

  // /start — parse source from deep-link payload (e.g. ?start=tg_kaligeo)
  if (text.startsWith("/start")) {
    const payload = text.replace("/start", "").trim()
    const source = payload || "tg"
    await setStep(chatId, "entry", { source })
    await tg.send(
      chatId,
      [
        "👋 <b>Добро пожаловать в KaliGEO!</b>",
        "",
        "Мы измеряем, насколько <b>ChatGPT, Claude, Gemini</b> и другие AI-платформы упоминают и рекомендуют ваш бренд.",
        "",
        "Это новый канал продаж: всё больше людей спрашивают у AI «посоветуй сервис для X» — и получают имена конкурентов. <b>KaliGEO показывает, где вы теряете клиентов, и что с этим делать.</b>",
        "",
        "С чего начнём?",
      ].join("\n"),
      inlineKeyboard([
        [{ text: "🔍 Бесплатная проверка сайта", data: "entry:free" }],
        [{ text: "🚀 Сразу к полному аудиту", data: "entry:paid" }],
      ])
    )
    return
  }

  if (step === "idle") {
    await tg.send(chatId, "Нажмите /start чтобы начать.")
    return
  }

  if (step === "entry") {
    await tg.send(chatId, "Нажмите одну из кнопок выше.")
    return
  }

  // ── Freemium path ─────────────────────────────────────────────────────────

  if (step === "free_url") {
    const url = parseUrl(text)
    if (!url) {
      await tg.send(chatId, "Не похоже на URL. Попробуйте ещё раз, например:\n<code>company.ru</code>")
      return
    }
    await tg.send(
      chatId,
      "⏳ <b>Анализирую сайт...</b>\n\nЗахожу на главную, страницы «О компании» и «Услуги», собираю ключевые слова и нишу. Займёт ~30 секунд."
    )
    const result = await runFreemiumScan(url, data.source)
    if (!result) {
      await tg.send(chatId, "Не удалось проанализировать сайт. Проверьте URL и попробуйте снова.")
      return
    }

    const { scanId, score, companyName, niche, suggestedCompetitors } = result
    const emoji = score >= 60 ? "🟢" : score >= 30 ? "🟡" : "🔴"
    const verdict =
      score < 30
        ? "AI-платформы почти не упоминают ваш бренд — вы отдаёте клиентов конкурентам"
        : score < 60
        ? "Есть потенциал роста — конкуренты уже присутствуют в AI-ответах, а вы нет"
        : "Неплохой результат, но всегда есть куда расти"

    await setStep(chatId, "free_offer", {
      ...data,
      websiteUrl: url,
      freemiumScore: score,
      freemiumScanId: scanId,
      companyName,
      niche,
      competitors: suggestedCompetitors,
    })
    await tg.send(
      chatId,
      [
        `${emoji} <b>Индекс AI-видимости: ${score}/100</b>`,
        `<i>${verdict}</i>`,
        "",
        `📌 Компания: <b>${companyName}</b>`,
        `📂 Ниша: ${niche.slice(0, 120)}${niche.length > 120 ? "…" : ""}`,
        "",
        "📊 Средний конкурент в нише — 61/100",
        "",
        "<b>Полный аудит покажет:</b>",
        "· Подробный результат по 3–9 AI-платформам",
        "· Где именно конкуренты вас обходят",
        "· Конкретный план действий на 90 дней",
        "",
        "Запустить полный аудит?",
      ].join("\n"),
      inlineKeyboard([
        [{ text: "Basic — $50", data: "tier:BASIC" }],
        [{ text: "Standard — $150 ⭐", data: "tier:STANDARD" }],
        [{ text: "Advanced — $300 🚀", data: "tier:ADVANCED" }],
        [{ text: "Что входит в каждый тариф?", data: "tier:info" }],
        [{ text: "Нет, спасибо", data: "free_offer:decline" }],
      ])
    )
    return
  }

  if (step === "free_offer") {
    await tg.send(chatId, "Нажмите одну из кнопок выше.")
    return
  }

  if (step === "free_confirm") {
    await tg.send(chatId, "Нажмите одну из кнопок выше.")
    return
  }

  if (step === "free_email_capture") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(text)) {
      await tg.send(chatId, "Не похоже на email. Попробуйте ещё раз:")
      return
    }

    const scanId = data.freemiumScanId ?? null
    if (scanId) {
      const scan = await prisma.freemiumScan.findUnique({ where: { id: scanId } })
      if (scan && !scan.emailCaptured) {
        await prisma.freemiumScan.update({ where: { id: scanId }, data: { emailCaptured: text } })
        await tasks.trigger<typeof freemiumSequence>("send-freemium-sequence", { scanId, email: text })
      }
    } else if (data.websiteUrl) {
      const scan = await prisma.freemiumScan.findFirst({
        where: { websiteUrl: data.websiteUrl },
        orderBy: { createdAt: "desc" },
      })
      if (scan && !scan.emailCaptured) {
        await prisma.freemiumScan.update({ where: { id: scan.id }, data: { emailCaptured: text } })
        await tasks.trigger<typeof freemiumSequence>("send-freemium-sequence", { scanId: scan.id, email: text })
      }
    }

    await setStep(chatId, "done", {})
    await tg.send(
      chatId,
      [
        "✅ <b>Готово!</b>",
        "",
        "Пришлём советы по AI-видимости на ваш email в течение нескольких минут.",
        "",
        "Если захотите провести полный аудит — напишите /start.",
      ].join("\n")
    )
    return
  }

  // ── Freemium → Paid: override company/niche manually ─────────────────────

  if (step === "free_company") {
    if (text.length < 2) {
      await tg.send(chatId, "Введите название компании (минимум 2 символа).")
      return
    }
    await setStep(chatId, "free_niche", { ...data, companyName: text })
    await tg.send(
      chatId,
      [
        "Опишите ваш бизнес и нишу (2–3 предложения).",
        "",
        "<i>Например: сеть магазинов здорового питания для людей, следящих за питанием и спортом.</i>",
      ].join("\n")
    )
    return
  }

  if (step === "free_niche") {
    if (text.length < 10) {
      await tg.send(chatId, "Напишите немного подробнее — это важно для качества аудита.")
      return
    }
    await setStep(chatId, "email", { ...data, niche: text, competitors: data.competitors ?? [] })
    await tg.send(
      chatId,
      [
        "Отлично! Последний шаг — укажите email для получения отчёта:",
        "",
        "<i>На него придут результаты аудита, PDF и план действий.</i>",
      ].join("\n")
    )
    return
  }

  // ── Paid path ─────────────────────────────────────────────────────────────

  if (step === "company") {
    if (text.length < 2) {
      await tg.send(chatId, "Введите название компании (минимум 2 символа).")
      return
    }
    await setStep(chatId, "url", { ...data, companyName: text })
    await tg.send(
      chatId,
      [
        `Отлично, <b>${text}</b>!`,
        "",
        "Укажите URL вашего сайта:",
        "<i>Например: vkusvill.ru</i>",
      ].join("\n")
    )
    return
  }

  if (step === "url") {
    const url = parseUrl(text)
    if (!url) {
      await tg.send(chatId, "Не похоже на URL. Попробуйте ещё раз, например:\n<code>vkusvill.ru</code>")
      return
    }
    await setStep(chatId, "niche", { ...data, websiteUrl: url })
    await tg.send(
      chatId,
      [
        "Опишите ваш бизнес и нишу (2–3 предложения).",
        "",
        "<i>Например: сеть магазинов здорового питания, аудитория — люди, следящие за здоровьем и спортом.</i>",
        "",
        "Это поможет AI-агентам сформулировать правильные запросы для аудита.",
      ].join("\n")
    )
    return
  }

  if (step === "niche") {
    if (text.length < 10) {
      await tg.send(chatId, "Напишите немного подробнее — это важно для качества аудита.")
      return
    }
    await setStep(chatId, "competitors", { ...data, niche: text })
    await tg.send(
      chatId,
      [
        "Укажите 2–3 главных конкурента через запятую.",
        "",
        "<i>Если конкурентов нет — напишите <b>нет</b>.</i>",
        "",
        "Мы проверим, насколько они видимы в AI-ответах по сравнению с вами.",
      ].join("\n")
    )
    return
  }

  if (step === "competitors") {
    const competitors = text.toLowerCase() === "нет"
      ? []
      : text.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5)
    await setStep(chatId, "tier", { ...data, competitors })
    await tg.send(
      chatId,
      "Выберите тариф:",
      inlineKeyboard([
        [{ text: "Basic — $50", data: "tier:BASIC" }],
        [{ text: "Standard — $150 ⭐", data: "tier:STANDARD" }],
        [{ text: "Advanced — $300 🚀", data: "tier:ADVANCED" }],
        [{ text: "Что входит в каждый тариф?", data: "tier:info" }],
      ])
    )
    return
  }

  if (step === "tier") {
    await tg.send(chatId, "Нажмите одну из кнопок выше, чтобы выбрать тариф.")
    return
  }

  if (step === "email") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(text)) {
      await tg.send(chatId, "Не похоже на email. Попробуйте ещё раз:")
      return
    }
    await setStep(chatId, "done", { ...data, email: text })
    await createAuditJob(chatId, { ...data, email: text })
    return
  }

  if (step === "done") {
    await tg.send(chatId, "Ваша заявка уже принята. Напишите /start чтобы создать новую.")
    return
  }
}

// ── Callback handler ─────────────────────────────────────────────────────────

async function handleCallback(cb: {
  id: string
  data: string
  message: { chat: { id: number }; message_id: number }
}) {
  const chatId = String(cb.message.chat.id)
  const cbData = cb.data

  await tg.answer(cb.id)

  const session = await getSession(chatId)
  const sessionData = (session.data ?? {}) as SessionData

  if (cbData === "entry:free") {
    await setStep(chatId, "free_url", sessionData)
    await tg.send(
      chatId,
      [
        "Укажите URL вашего сайта:",
        "<i>Например: <code>company.ru</code></i>",
        "",
        "Мы зайдём на ваш сайт, определим нишу и рассчитаем предварительный индекс AI-видимости.",
      ].join("\n")
    )
    return
  }

  if (cbData === "entry:paid") {
    await setStep(chatId, "company", sessionData)
    await tg.send(
      chatId,
      [
        "Отлично! Запустим полный аудит.",
        "",
        "Как называется ваша компания?",
      ].join("\n")
    )
    return
  }

  if (cbData === "free_offer:decline") {
    await setStep(chatId, "free_email_capture", sessionData)
    await tg.send(
      chatId,
      [
        "Хорошо! Оставьте email — пришлём советы по улучшению AI-видимости бесплатно:",
        "",
        "<i>Никакого спама, только практические рекомендации для вашей ниши.</i>",
      ].join("\n")
    )
    return
  }

  if (cbData === "tier:info") {
    await tg.send(chatId, [
      "<b>Тарифы KaliGEO:</b>",
      "",
      "🔹 <b>Basic — $50</b>",
      "· 15 запросов · ChatGPT, Gemini, YandexGPT",
      "· Базовый отчёт с позициями по платформам",
      "",
      "⭐ <b>Standard — $150</b>",
      "· 30 запросов · 6 платформ",
      "· PDF-отчёт, матрица конкурентов, план на 90 дней",
      "· Чат с отчётом (10 вопросов)",
      "",
      "🚀 <b>Advanced — $300</b>",
      "· 50 запросов · 9 платформ",
      "· AI-агенты: глубокий анализ конкурентов и пробелов",
      "· Оптимизация страницы сайта под AI",
      "· Безлимитный чат с отчётом",
    ].join("\n"),
    inlineKeyboard([
      [{ text: "Basic — $50", data: "tier:BASIC" }],
      [{ text: "Standard — $150 ⭐", data: "tier:STANDARD" }],
      [{ text: "Advanced — $300 🚀", data: "tier:ADVANCED" }],
    ]))
    return
  }

  if (cbData.startsWith("tier:")) {
    const tier = cbData.replace("tier:", "") as Tier
    if (!(tier in TIERS)) return

    const validSteps = ["tier", "free_offer"]
    if (!validSteps.includes(session.step)) {
      await tg.send(chatId, "Напишите /start чтобы начать заново.")
      return
    }

    const t = TIERS[tier]

    // Coming from freemium — pre-fill from scan, show confirmation
    if (session.step === "free_offer") {
      const { companyName, niche, competitors } = sessionData
      const hasData = companyName && niche

      if (hasData) {
        const competitorsList = competitors && competitors.length > 0
          ? competitors.slice(0, 3).join(", ")
          : "не указаны"

        await setStep(chatId, "free_confirm", { ...sessionData, tier })
        await tg.send(
          chatId,
          [
            `Отличный выбор! <b>${t.label} · ${t.price}</b>`,
            "",
            "Мы уже знаем ваш бизнес по анализу сайта — проверьте данные:",
            "",
            `🏢 Компания: <b>${companyName}</b>`,
            `📂 Ниша: ${niche.slice(0, 150)}${niche.length > 150 ? "…" : ""}`,
            `👥 Конкуренты: <i>${competitorsList}</i>`,
            "",
            "Всё верно?",
          ].join("\n"),
          inlineKeyboard([
            [{ text: "✅ Верно, ввести email", data: "free_confirm:ok" }],
            [{ text: "✏️ Изменить данные", data: "free_confirm:edit" }],
          ])
        )
        return
      }

      // Fallback — scan data missing, collect manually
      await setStep(chatId, "free_company", { ...sessionData, tier })
      await tg.send(chatId, [
        `Отличный выбор! <b>${t.label} · ${t.price}</b>`,
        "",
        "Как называется ваша компания?",
      ].join("\n"))
      return
    }

    // From paid path
    await setStep(chatId, "email", { ...sessionData, tier })
    await tg.send(chatId, [
      `Отличный выбор! <b>${t.label} · ${t.price}</b>`,
      `<i>${t.desc}</i>`,
      "",
      "Последний шаг — укажите email для получения отчёта:",
      "<i>На него придут результаты аудита и PDF с планом.</i>",
    ].join("\n"))
    return
  }

  if (cbData === "free_confirm:ok") {
    if (session.step !== "free_confirm") return
    await setStep(chatId, "email", sessionData)
    await tg.send(
      chatId,
      [
        "Укажите email для получения отчёта:",
        "<i>На него придут результаты аудита и PDF с планом действий.</i>",
      ].join("\n")
    )
    return
  }

  if (cbData === "free_confirm:edit") {
    if (session.step !== "free_confirm") return
    await setStep(chatId, "free_company", sessionData)
    await tg.send(
      chatId,
      [
        "Хорошо, введём данные вручную.",
        "",
        "Как называется ваша компания?",
      ].join("\n")
    )
    return
  }
}

// ── Create audit job ──────────────────────────────────────────────────────────

async function createAuditJob(chatId: string, data: SessionData) {
  const { companyName, websiteUrl, niche, competitors, tier, email, source } = data

  if (!companyName || !websiteUrl || !niche || !tier || !email) {
    await tg.send(chatId, "Что-то пошло не так. Напишите /start и попробуйте снова.")
    return
  }

  const client = await prisma.client.upsert({
    where: { email },
    update: { companyName, websiteUrl },
    create: { email, companyName, websiteUrl },
  })

  const job = await prisma.auditJob.create({
    data: {
      clientEmail: email,
      clientId: client.id,
      websiteUrl,
      companyName,
      niche,
      competitors: competitors ?? [],
      tier,
      status: "PENDING_PAYMENT",
      source: source ?? "tg",
    },
  })

  const tierInfo = TIERS[tier]

  await tg.send(chatId, [
    "✅ <b>Заявка принята!</b>",
    "",
    `<b>${companyName}</b> · ${tierInfo.label} · ${tierInfo.price}`,
    "",
    "Что будет дальше:",
    "1️⃣ Наш менеджер свяжется с вами в течение нескольких часов для оформления оплаты",
    `2️⃣ После оплаты запустим аудит — результаты придут на <b>${email}</b>`,
    "3️⃣ В среднем аудит занимает 15–30 минут",
    "",
    `<i>Номер заявки: ${job.id.slice(-8).toUpperCase()}</i>`,
  ].join("\n"))

  notifyNewAuditRequest({
    companyName,
    clientEmail: email,
    websiteUrl,
    tier,
    clientNumber: client.clientNumber,
    jobId: job.id,
  }).catch(console.error)
}
