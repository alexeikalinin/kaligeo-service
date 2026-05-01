# Agent System

tags: #technical #agents #architecture

## Карта агентов

```
┌─────────────────────────────────────────────────────────┐
│                    КЛИЕНТСКИЙ СЛОЙ                       │
├─────────────────────────────────────────────────────────┤
│  Chat Agent (/api/chat)                                  │
│  • Сбор данных для аудита через диалог                   │
│  • Вызывает submit_audit tool → запускает пайплайн       │
│  • Доступен всем тарифам                                 │
│                                                          │
│  Report Chat Agent (/api/report/[id]/chat)   [TODO]      │
│  • Отвечает на вопросы по конкретному отчёту             │
│  • Standard: 10 сообщений, Advanced: безлимит            │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  ФОНОВЫЙ ПАЙПЛАЙН                        │
│              (Trigger.dev, авто-запуск)                  │
├─────────────────────────────────────────────────────────┤
│  1. Query Generator (OpenAI GPT-4o)                      │
│     BASIC:15 / STANDARD:50 / ADVANCED:150 запросов       │
│                                                          │
│  2. Platform Executor (параллельно, все платформы)       │
│     BASIC:3 / STANDARD:6 / ADVANCED:8 платформ          │
│                                                          │
│  3. Analyzer (детерминированный, без LLM)                │
│     scores, competitor matrix, weak points               │
│                                                          │
│  4. Action Plan Generator (Claude Sonnet)                │
│     STANDARD+: 30/60/90d план                           │
│                                                          │
│  5. PDF Renderer (@react-pdf/renderer)                   │
│     STANDARD+: PDF 28 страниц                           │
│                                                          │
│  6. Email Delivery (Resend)                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              ON-DEMAND АГЕНТЫ (Admin/Advanced)            │
├─────────────────────────────────────────────────────────┤
│  Orchestrator                                            │
│  • Координирует специализированных агентов               │
│  • tool_use loop, Claude Sonnet                          │
│                                                          │
│  Analysis Agent                                          │
│  • Углублённый анализ: competitors / sentiment / gaps    │
│  • Читает raw QueryResults из DB                         │
│                                                          │
│  Content Agent                                           │
│  • Контент-брифы, FAQ, Schema-рекомендации               │
│  • На основе weak points + competitor strengths          │
│                                                          │
│  Report Agent                                            │
│  • Регенерация секций: actionPlan / summary / notes      │
│  • Обновляет Report в Prisma                             │
└─────────────────────────────────────────────────────────┘
```

## Платформы по тарифам

| Платформа | Basic | Standard | Advanced |
|---|---|---|---|
| ChatGPT | ✅ | ✅ | ✅ |
| Gemini | ✅ | ✅ | ✅ |
| YandexGPT | ✅ | ✅ | ✅ |
| Claude | ❌ | ✅ | ✅ |
| Perplexity | ❌ | ✅ | ✅ |
| DeepSeek | ❌ | ✅ | ✅ |
| GigaChat | ❌ | ❌ | ✅ |
| Alisa | ❌ | ❌ | ✅ |

> ⚠️ Alisa не реализована — см. [[Feature Backlog#alisa]]

## Файлы

```
lib/agents/
├── orchestrator.ts      — tool_use координатор
├── analysis-agent.ts    — анализ результатов
├── content-agent.ts     — контентные рекомендации
├── report-agent.ts      — регенерация секций
└── index.ts             — dispatchTool()

trigger/
├── audit-pipeline.ts    — главный оркестратор пайплайна
└── steps/
    ├── generate-queries.ts
    ├── execute-queries.ts
    ├── render-pdf.ts
    └── deliver.ts

app/api/
├── chat/route.ts              — chat agent endpoint
├── audit/submit/route.ts      — запуск аудита
├── audit/[id]/status/route.ts — статус
├── report/data/[id]/route.ts  — данные отчёта
├── report/generate-pdf/route.ts
└── admin/agents/route.ts      — on-demand агенты
```

## Связанные заметки
- [[Monetization Model]] — feature gates по тарифам
- [[Post-Audit Chat]] — архитектура report chat
- [[AI Platforms]] — API каждой платформы
