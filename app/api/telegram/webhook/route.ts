import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { tg, inlineKeyboard } from "@/lib/telegram"
import { notifyNewAuditRequest } from "@/lib/notify"

const ADMIN_CHAT_ID = process.env.ADMIN_TELEGRAM_CHAT_ID ?? ""

const TIERS = {
  BASIC:    { label: "Basic",    desc: "15 запросов · 3 платформы · $50",  price: "$50" },
  STANDARD: { label: "Standard", desc: "30 запросов · 6 платформ · $150",  price: "$150" },
  ADVANCED: { label: "Advanced", desc: "50 запросов · 9 платформ · $300",  price: "$300" },
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
    const url = raw.startsWith("http") ? raw : `https://${raw}`
    new URL(url)
    return url
  } catch {
    return null
  }
}

async function runFreemiumScan(websiteUrl: string, source?: string): Promise<{ scanId: string; score: number } | null> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const res = await fetch(`${appUrl}/api/freemium/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ websiteUrl, source }),
    })
    if (!res.ok) return null
    const { scanId } = await res.json() as { scanId?: string }
    if (!scanId) return null
    const scan = await prisma.freemiumScan.findUnique({ where: { id: scanId } })
    if (!scan) return null
    return { scanId, score: scan.previewScore }
  } catch {
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
        "Мы измеряем, насколько ChatGPT, Claude, Gemini и другие AI рекомендуют ваш бренд.",
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
      await tg.send(chatId, "Не похоже на URL. Попробуйте ещё раз, например: company.ru")
      return
    }
    await tg.send(chatId, "⏳ Анализирую сайт... (~30 сек)")
    const result = await runFreemiumScan(url, data.source)
    if (!result) {
      await tg.send(chatId, "Не удалось проанализировать сайт. Проверьте URL и попробуйте снова.")
      return
    }

    const { score } = result
    const emoji = score >= 60 ? "🟢" : score >= 30 ? "🟡" : "🔴"
    const verdict =
      score < 30
        ? "AI-платформы почти не упоминают ваш бренд"
        : score < 60
        ? "Есть потенциал роста — конкуренты могут обгонять вас"
        : "Неплохой результат, но всегда есть куда расти"

    await setStep(chatId, "free_offer", { ...data, websiteUrl: url, freemiumScore: score })
    await tg.send(
      chatId,
      [
        `${emoji} <b>Индекс AI-видимости: ${score}/100</b>`,
        `<i>${verdict}</i>`,
        "",
        "📊 Средний конкурент в нише — 61/100",
        "",
        "Полный аудит покажет:",
        "· Детальные результаты по 9 платформам",
        "· Где именно конкуренты вас обходят",
        "· Конкретный план на 90 дней",
        "",
        "Запустить полный аудит?",
      ].join("\n"),
      inlineKeyboard([
        [{ text: "Basic — $50", data: "tier:BASIC" }],
        [{ text: "Standard — $150 ⭐", data: "tier:STANDARD" }],
        [{ text: "Advanced — $300 🚀", data: "tier:ADVANCED" }],
        [{ text: "Нет, спасибо", data: "free_offer:decline" }],
      ])
    )
    return
  }

  if (step === "free_offer") {
    await tg.send(chatId, "Нажмите одну из кнопок выше.")
    return
  }

  if (step === "free_email_capture") {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(text)) {
      await tg.send(chatId, "Не похоже на email. Попробуйте ещё раз:")
      return
    }
    if (data.websiteUrl) {
      const scan = await prisma.freemiumScan.findFirst({
        where: { websiteUrl: data.websiteUrl },
        orderBy: { createdAt: "desc" },
      })
      if (scan && !scan.emailCaptured) {
        await prisma.freemiumScan.update({ where: { id: scan.id }, data: { emailCaptured: text } })
      }
    }
    await setStep(chatId, "done", {})
    await tg.send(
      chatId,
      "✅ Готово! Пришлём советы по AI-видимости на ваш email.\n\nЧтобы запустить полный аудит — напишите /start."
    )
    return
  }

  // ── Freemium → Paid transition ────────────────────────────────────────────

  if (step === "free_company") {
    if (text.length < 2) {
      await tg.send(chatId, "Введите название компании (минимум 2 символа).")
      return
    }
    await setStep(chatId, "free_niche", { ...data, companyName: text })
    await tg.send(chatId, "Опишите ваш бизнес и нишу (2–3 предложения):\n\n<i>Например: сеть магазинов здорового питания.</i>")
    return
  }

  if (step === "free_niche") {
    if (text.length < 10) {
      await tg.send(chatId, "Напишите немного подробнее — это важно для качества аудита.")
      return
    }
    await setStep(chatId, "email", { ...data, niche: text, competitors: [] })
    await tg.send(chatId, "Укажите email для получения отчёта:")
    return
  }

  // ── Paid path ─────────────────────────────────────────────────────────────

  if (step === "company") {
    if (text.length < 2) {
      await tg.send(chatId, "Введите название компании (минимум 2 символа).")
      return
    }
    await setStep(chatId, "url", { ...data, companyName: text })
    await tg.send(chatId, `Отлично, <b>${text}</b>!\n\nУкажите URL вашего сайта:`)
    return
  }

  if (step === "url") {
    const url = parseUrl(text)
    if (!url) {
      await tg.send(chatId, "Не похоже на URL. Попробуйте ещё раз, например: vkusvill.ru")
      return
    }
    await setStep(chatId, "niche", { ...data, websiteUrl: url })
    await tg.send(chatId, "Опишите ваш бизнес и нишу (2–3 предложения):\n\n<i>Например: сеть магазинов здорового питания, аудитория — люди, следящие за здоровьем.</i>")
    return
  }

  if (step === "niche") {
    if (text.length < 10) {
      await tg.send(chatId, "Напишите немного подробнее — это важно для качества аудита.")
      return
    }
    await setStep(chatId, "competitors", { ...data, niche: text })
    await tg.send(chatId, "Укажите 2–3 главных конкурента через запятую.\n\nЕсли конкурентов нет — напишите <b>нет</b>.")
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
    await tg.send(chatId, "Укажите URL вашего сайта:")
    return
  }

  if (cbData === "entry:paid") {
    await setStep(chatId, "company", sessionData)
    await tg.send(chatId, "Как называется ваша компания?")
    return
  }

  if (cbData === "free_offer:decline") {
    await setStep(chatId, "free_email_capture", sessionData)
    await tg.send(chatId, "Хорошо! Оставьте email — пришлём советы по улучшению AI-видимости бесплатно:")
    return
  }

  if (cbData === "tier:info") {
    await tg.send(chatId, [
      "<b>Тарифы KaliGEO:</b>",
      "",
      "🔹 <b>Basic — $50</b>",
      "· 15 запросов · ChatGPT, Gemini, YandexGPT",
      "· Базовый отчёт",
      "",
      "⭐ <b>Standard — $150</b>",
      "· 30 запросов · 6 платформ",
      "· PDF-отчёт, матрица конкурентов, план на 90 дней",
      "· Чат с отчётом (10 вопросов)",
      "",
      "🚀 <b>Advanced — $300</b>",
      "· 50 запросов · 9 платформ",
      "· AI-агенты: глубокий анализ конкурентов",
      "· Исправление страницы сайта",
      "· Безлимитный чат",
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
    if (!validSteps.includes(session.step)) return

    const t = TIERS[tier]

    // Coming from freemium — need company name and niche still
    if (session.step === "free_offer") {
      await setStep(chatId, "free_company", { ...sessionData, tier })
      await tg.send(chatId, [
        `Отличный выбор! <b>${t.label} · ${t.price}</b>`,
        "",
        "Как называется ваша компания?",
      ].join("\n"))
      return
    }

    await setStep(chatId, "email", { ...sessionData, tier })
    await tg.send(chatId, [
      `Отличный выбор! <b>${t.label} · ${t.price}</b>`,
      `<i>${t.desc}</i>`,
      "",
      "Укажите email для получения отчёта:",
    ].join("\n"))
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
    "Наш менеджер свяжется с вами в ближайшее время для оформления оплаты.",
    "Как только оплата пройдёт — сразу запустим аудит и пришлём отчёт на",
    `<b>${email}</b>`,
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
