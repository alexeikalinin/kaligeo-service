# Post-Audit Chat

tags: #feature #agents #monetization #standard #advanced

## Что это

После получения отчёта клиент может задавать вопросы в чате — ИИ отвечает с полным контекстом его аудита (scores, конкуренты, weak points, action plan).

## Почему это ключевая фича

Отчёт — это данные. Чат — это понимание.
- "Что делать первым делом при score 23?"
- "Почему Perplexity не упоминает нас, а ChatGPT упоминает?"
- "Составь мне ТЗ для контент-менеджера по первому пункту плана"

## Архитектура

```
/report/{id} → кнопка "Спросить AI"
    ↓
Открывается боковая панель/модал с чатом
    ↓
POST /api/report/{id}/chat
    ↓
streamText({
  system: REPORT_CONTEXT_PROMPT + JSON.stringify(reportData),
  messages: conversationHistory,
  tools: {
    get_query_examples,  // показать примеры запросов где не упоминается
    regenerate_section,  // только ADVANCED
    get_content_brief,   // только ADVANCED
  }
})
```

## System prompt для report chat

```
Ты — эксперт по AI-видимости брендов. Отвечаешь на вопросы по результатам аудита.

Данные аудита компании {companyName}:
- Overall Score: {overallScore}/100
- Ниша: {niche}
- Платформы: {platformScores}
- Конкуренты: {competitorMatrix}
- Слабые места: {weakPoints}
- Action Plan: {actionPlan}

Отвечай конкретно, ссылайся на данные. Если предлагаешь действия — указывай приоритет.
```

## Feature gates

| Тариф | Доступ | Лимит | Инструменты |
|---|---|---|---|
| Basic | ❌ | — | — |
| Standard | ✅ | 10 сообщ/аудит | только чтение данных |
| Advanced | ✅ | Безлимит | + regenerate, content brief |

## Счётчик сообщений

В модели `AuditJob` добавить поле:
```prisma
chatMessagesUsed Int @default(0)
```

При каждом запросе в `/api/report/{id}/chat`:
1. Проверить `job.tier` → получить лимит
2. Проверить `job.chatMessagesUsed < limit`
3. После ответа инкрементировать счётчик
4. При достижении лимита — показать апсейл

## UI

- Кнопка "Спросить AI" в правом нижнем углу `/report/{id}`
- Slide-over панель с историей чата
- Счётчик: "3 из 10 вопросов использовано" (Standard)
- При лимите: "Получите Advanced для безлимитного доступа"

## Статус реализации

- [x] `app/api/report/[id]/chat/route.ts` — streaming, tier check, counter
- [x] `components/report/ReportChatPanel.tsx` — slide-over чат с лимитом и апсейлом
- [x] `lib/gates.ts` — feature gates
- [x] Prisma: `chatMessagesUsed Int @default(0)` добавлено
- [x] Апсейл-компонент при достижении лимита (inline в панели)

## Связанные заметки
- [[Monetization Model]] — тарифы
- [[Agent System]] — агенты которые используются в чате
- [[Feature Backlog]] — очередь реализации
