---
title: "Как мы строили GEO-аудитор: архитектура, ошибки и уроки"
platform: Habr
publish_date: 2026-08-05
author_persona: fullstack-разработчик, основатель продукта, пишет технически и честно
tone: технический постмортем, от первого лица, честно об ошибках, без маркетингового шума
status: ready
tags: [GEO, Next.js, Trigger.dev, LLM, API, архитектура, TypeScript, Prisma, Vercel, AI, разработка]
created: 2026-08-05
---

# Как мы строили GEO-аудитор: архитектура, ошибки и уроки

Около года назад я начал строить KaliGEO — инструмент для измерения видимости брендов в ответах нейросетей. Идея простая: отправить набор запросов в ChatGPT, Gemini, Claude, Perplexity, YandexGPT, GigaChat, DeepSeek и Алису — и посчитать, как часто и как упоминается нужный бренд.

На словах — пять минут. На практике — несколько месяцев итераций, несколько нетривиальных архитектурных решений и пара ошибок, которые я хотел бы зафиксировать для тех, кто пойдёт похожим путём.

Стек: Next.js 15 App Router, TypeScript, Prisma 7 + PostgreSQL (Neon/Supabase), Trigger.dev v3, Vercel, Anthropic SDK, Vercel AI SDK v6.

---

## Что это за задача технически

Аудит — это по сути batch-операция с LLM API. На вход: бренд, ниша, конкуренты, несколько параметров. На выход: структурированный отчёт с процентами видимости, матрицей конкурентов, слабыми точками и планом действий.

Сложности начинаются там, где это кажется простым:

1. **8 разных API** с разными форматами, ошибками, rate limits и поведением
2. **30–150 запросов** на аудит, которые нужно выполнить параллельно, но не сломать чужие лимиты
3. **Время выполнения до 40 минут** — это не вписывается ни в один serverless timeout
4. **Разная «природа» ответов** — нейросети не просто да/нет, а текст, из которого нужно извлекать структурированные данные
5. **Стоимость** — 150 запросов × 8 платформ = дорого, если не оптимизировать

---

## Архитектура верхнего уровня

```
Client (Next.js App Router)
    │
    ├── POST /api/audit/submit
    │       └── Creates AuditJob in PostgreSQL
    │       └── Triggers Trigger.dev task: audit-pipeline
    │
    ├── GET /api/audit/[id]/status  (polling)
    │
    └── GET /report/[id]?token=...
            └── Reads from DB, renders report UI

Background (Trigger.dev)
    └── audit-pipeline
            ├── Step 1: generateQueries (GPT-4o-mini)
            ├── Step 2: executeQueriesOnPlatform (8x parallel)
            ├── Step 3: calculateVisibilityScores + buildCompetitorMatrix
            ├── Step 4: runAnalysisAgent + runContentAgent (Advanced tier)
            ├── Step 5: runGrowthPlanAgent / generateActionPlan
            ├── Step 6: renderPDF (@react-pdf/renderer → Vercel Blob)
            └── Step 7: sendEmail (Resend)
```

Ключевое архитектурное решение: **разделение web-слоя и фонового процессинга**. Next.js отвечает за UI и быстрые API-ответы, Trigger.dev — за всё долгое и тяжёлое.

---

## Trigger.dev: почему именно он

Самый частый вопрос на ревью: «Зачем Trigger.dev? Почему не просто очередь сообщений?»

Потому что аудит — это не просто очередь, это **оркестрация с состоянием**.

Вот что нам нужно:
- Задача живёт до 1 часа (Vercel functions timeout — 300 секунд по умолчанию)
- Задача имеет несколько шагов с зависимостями
- Нужна видимость прогресса в реальном времени
- При падении шага — не повторять всё с нуля
- Параллельное выполнение внутри шага

Trigger.dev v3 закрывает всё это из коробки. Воркер запускается как отдельный процесс (локально или в облаке), получает задачи через очередь, у каждого шага есть retry-логика, и весь прогресс записывается в их дашборд.

```typescript
// trigger/audit-pipeline.ts
export const auditPipeline = task({
  id: "audit-pipeline",
  maxDuration: 3600, // 1 час
  run: async (payload: AuditPipelinePayload, { ctx }) => {
    
    // Step 1: Generate queries
    await updateJobStatus(payload.jobId, "generating_queries");
    const queries = await generateQueries({
      brand: payload.brand,
      niche: payload.niche,
      queryCount: getQueryCount(payload.tier),
    });

    // Step 2: Execute on all platforms in parallel
    await updateJobStatus(payload.jobId, "executing_queries");
    const platforms = getActivePlatforms(payload.tier);
    
    const results = await Promise.allSettled(
      platforms.map(platform =>
        executeQueriesOnPlatform(platform, queries, payload.jobId)
      )
    );

    // ... rest of pipeline
  }
});
```

---

## 8 AI-клиентов: унификация разнообразия

Каждый AI-провайдер — это своя боль. Вот краткая карта:

| Платформа | SDK | Особенности |
|-----------|-----|-------------|
| ChatGPT | openai | Стабильный, хорошая документация |
| Gemini | @google/generative-ai | Нужен отдельный пакет, форматы ответов отличаются |
| Claude | @anthropic-ai/sdk | Возвращает stop_reason, нужно обработать |
| Perplexity | openai (совместимый) | OpenAI-совместимый API, но модели свои |
| DeepSeek | openai (совместимый) | Тоже совместимый, но иногда timeout |
| YandexGPT | fetch (собственный) | Нет официального JS SDK, только REST |
| GigaChat | fetch (собственный) | OAuth token + TLS: `NODE_TLS_REJECT_UNAUTHORIZED=0` |
| Алиса | Yandex SpeechKit / Dialogs API | Самая сложная — голосовой интерфейс с ограничениями |

Мы ввели общий интерфейс:

```typescript
// lib/ai-clients/types.ts
export interface AIClient {
  name: string;
  platform: Platform;
  isConfigured(): boolean;
  query(prompt: string): Promise<string>;
}
```

`isConfigured()` проверяет наличие нужного API-ключа в env. `getActivePlatforms()` возвращает только сконфигурированные клиенты — так мы избегаем ошибок «ключ не задан» в рантайме.

### GigaChat: самый нетривиальный

GigaChat — отдельная история. Сбер использует OAuth 2.0 с короткоживущими токенами (30 минут) и самоподписанным сертификатом на своих серверах. В Node.js без воркараунда это падает с `UNABLE_TO_VERIFY_LEAF_SIGNATURE`.

Решение: отключаем проверку TLS только для OAuth-запроса, не для всего приложения:

```typescript
// lib/ai-clients/gigachat.ts
private async getAccessToken(): Promise<string> {
  const agent = new https.Agent({ rejectUnauthorized: false });
  
  const response = await fetch(GIGACHAT_AUTH_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}` },
    // @ts-ignore — node-fetch specific
    agent,
  });
  
  // cache token for 25 minutes
  const data = await response.json();
  this.tokenCache = { token: data.access_token, expiresAt: Date.now() + 25 * 60 * 1000 };
  return data.access_token;
}
```

Это не идеально, но до тех пор пока Сбер не выпустит нормальный CA-сертификат — рабочий вариант.

---

## Извлечение данных из текстовых ответов

Нейросеть не возвращает JSON. Она возвращает текст. А нам нужны структурированные данные: упомянут ли бренд, какова тональность, упоминаются ли конкуренты.

Первый подход был наивным: regex + keyword matching. Работало на 70% случаев, ломалось на 30%. «ТехноМаш упомянут» и «ТехноМаш не рекомендуется» — совершенно разные ситуации, которые regex не различает.

Второй подход: попросить ту же нейросеть проанализировать свой ответ. Дорого и медленно.

Третий, финальный: промпт-инжиниринг на этапе запроса. Мы форматируем каждый запрос так, чтобы получить ответ в предсказуемой структуре:

```typescript
const systemPrompt = `Ты отвечаешь на вопросы пользователя. 
В конце каждого ответа добавляй блок JSON следующего формата:
<data>
{"mentioned": ["название1", "название2"], "sentiment": {"название1": "positive|neutral|negative"}}
</data>
Это технический блок для аналитики, не включай его в основной ответ.`;
```

Потом парсим тег `<data>` из ответа. Работает надёжно на 95%+ запросов у основных провайдеров. GigaChat и Алиса иногда игнорируют инструкцию — для них дополнительная обработка.

---

## Агенты: анализ через Claude

Для Advanced-тира мы добавили агентный слой: три специализированных Claude-агента, которые делают глубокий анализ по результатам аудита.

```typescript
// lib/agents/orchestrator.ts
export async function runOrchestrator(
  jobId: string,
  agentType: "analysis" | "content" | "growth-plan",
  context: AgentContext
): Promise<AgentResult> {
  
  const client = new Anthropic();
  const tools = getToolsForAgent(agentType);
  const systemPrompt = getSystemPrompt(agentType);
  
  const messages: MessageParam[] = [
    { role: "user", content: buildContextMessage(context) }
  ];
  
  // Tool-calling loop
  while (true) {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: systemPrompt,
      tools,
      messages,
    });
    
    if (response.stop_reason === "end_turn") {
      return extractResult(response);
    }
    
    if (response.stop_reason === "tool_use") {
      const toolResults = await executeTools(response.content, jobId);
      messages.push({ role: "assistant", content: response.content });
      messages.push({ role: "user", content: toolResults });
    }
  }
}
```

Оркестратор — это стандартный tool-calling loop. Каждый агент специализирован: `analysis-agent` смотрит на конкурентов и рыночные паттерны, `content-agent` генерирует рекомендации по контент-стратегии, `growth-plan-agent` собирает итоговый план действий.

---

## Генерация PDF прямо в Vercel

PDF-генерация — это отдельная головная боль в serverless. Puppeteer требует Chromium, который весит сотни мегабайт и не влезает в Vercel Functions. Wkhtmltopdf — то же самое.

Мы пошли по пути `@react-pdf/renderer` — чистый JavaScript, без браузера. Рендеришь React-компонент в PDF напрямую.

```typescript
// trigger/steps/render-pdf.ts
import { renderToBuffer } from "@react-pdf/renderer";
import { ReportPDFDocument } from "@/components/pdf/ReportPDFDocument";

export async function renderAndUploadPDF(reportData: ReportData): Promise<string> {
  const buffer = await renderToBuffer(
    <ReportPDFDocument data={reportData} />
  );
  
  const blob = await put(`reports/${reportData.jobId}.pdf`, buffer, {
    access: "public",
    contentType: "application/pdf",
    token: process.env.BLOB_READ_WRITE_TOKEN!,
  });
  
  return blob.url;
}
```

Ограничения `@react-pdf/renderer`: нет CSS Grid, нет flexbox в полном объёме, ограниченная поддержка шрифтов. Но для структурированного отчёта с таблицами и диаграммами — достаточно. Производительность: PDF из 20 страниц генерируется за 3–5 секунд.

---

## Feature gates по тарифам

С самого начала у нас три тарифа: Basic ($50 / ~4900₽), Standard ($150 / ~14900₽), Advanced ($300 / ~29900₽). Они отличаются количеством платформ, запросов, наличием PDF, агентного анализа и ряда других функций.

Мы сделали единый файл `lib/gates.ts` — источник истины для всех фича-флагов:

```typescript
// lib/gates.ts
export const TIER_GATES = {
  BASIC: {
    platforms: ["chatgpt", "yandexgpt", "gigachat"],
    queryCount: 15,
    hasPDF: false,
    hasAgents: false,
    hasWebsiteFix: false,
    chatMessages: 0,
  },
  STANDARD: {
    platforms: ["chatgpt", "gemini", "claude", "perplexity", "yandexgpt", "gigachat"],
    queryCount: 50,
    hasPDF: true,
    hasAgents: false,
    hasWebsiteFix: false,
    chatMessages: 10,
  },
  ADVANCED: {
    platforms: ["chatgpt", "gemini", "claude", "perplexity", "deepseek", "yandexgpt", "gigachat", "alisa"],
    queryCount: 150,
    hasPDF: true,
    hasAgents: true,
    hasWebsiteFix: true,
    chatMessages: -1, // unlimited
  },
} as const;

export function getGates(tier: Tier) {
  return TIER_GATES[tier];
}
```

Правило: никаких inline-проверок `if (tier === "ADVANCED")` по всему коду. Только `getGates(tier).hasAgents`. Это резко упрощает изменение тарифных планов — меняешь один файл, и всё синхронизировано.

---

## Главные ошибки, которые я бы не повторял

### 1. Prisma 7 — читайте changelog перед апгрейдом

Мы начали с Prisma 6, потом неаккуратно обновились до 7. Prisma 7 убрала `url` и `directUrl` из `schema.prisma` — теперь они в `prisma.config.ts`. Кажется небольшим изменением, но если не знать — полдня потерять легко.

### 2. `pg` и `tls` в браузерном бандле

Prisma с `pg` адаптером тянет Node.js-специфичные модули. Если положить что-то из Prisma-типов в компонент — Next.js попытается собрать это в клиентский бандл и упадёт с `Module not found: Can't resolve 'tls'`.

Решение: строго разделять типы. Серверные типы — в серверных файлах, клиент-безопасные типы — в отдельном `semantic-analysis-types.ts` без единого импорта из Prisma.

### 3. Vercel AI SDK v6 — API изменился

Если вы находили примеры кода на useChat/AI SDK — смотрите версию. В v6:
- `useChat` принимает `DefaultChatTransport({ api })` вместо опции `api`
- Стримы: `toUIMessageStreamResponse()` вместо `toDataStreamResponse()`
- Инструменты: `convertToModelMessages()` для конвертации истории

Старые примеры из v5 не работают в v6.

### 4. Rate limiting на YandexGPT — неочевидный порог

YandexGPT имеет квоты на количество токенов в минуту, которые в документации описаны как «зависит от тарифа». На практике: если запускать 15+ запросов параллельно — получаешь 429 примерно на каждом третьем. Решение: батчи по 5 запросов с паузой 2 секунды.

---

## Что дальше

Несколько направлений, которые сейчас в работе:

**Кэширование на уровне запросов.** Один и тот же запрос «производители конвейерного оборудования» задаётся разными клиентами в одной нише. Можно кэшировать ответы на 24 часа — это снизит стоимость и ускорит аудиты.

**Webhook вместо polling.** Сейчас клиент поллит `/api/audit/[id]/status` каждые 3 секунды. Это работает, но неэлегантно. Переходим на SSE-стрим прогресса.

**Перплексити как источник real-time данных.** Уже сейчас Perplexity хорошо работает в real-time режиме. Хотим сделать отдельный «быстрый срез» на одну платформу — результат за 2–3 минуты вместо 40.

---

## Итоги

Что бы я сказал себе год назад, начиная этот проект:

1. **Trigger.dev — правильный выбор для оркестрации.** Альтернативы (Bull/BullMQ, Celery, самописная очередь) потребовали бы гораздо больше инфраструктуры.

2. **Строгая типизация спасла много времени.** TypeScript + Zod на границах API + единый `gates.ts` — это не оверинжиниринг, это необходимость когда кодовая база растёт быстро.

3. **LLM-ответы непредсказуемы.** Инвестируйте в обработку краевых случаев с самого начала. Модели меняют поведение с обновлениями, и то что работало вчера — может не работать завтра.

4. **Российские API специфичны.** GigaChat, YandexGPT, Алиса — это не «ещё один OpenAI». Там своя аутентификация, свои лимиты, своё поведение. Планируйте время на интеграцию.

Если хотите посмотреть на результат — [kaligeo.ru](https://kaligeo.ru). Если есть вопросы по архитектуре или хотите обсудить конкретные решения — пишите в комментарии.

---

*Автор — основатель KaliGEO. Стек: Next.js 15, TypeScript, Prisma 7, Trigger.dev v3, Vercel, Anthropic SDK, OpenAI SDK.*
