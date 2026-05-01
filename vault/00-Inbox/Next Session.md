# Следующая сессия

tags: #inbox #next

## Текущий статус (2026-05-01)

Код полностью готов, TypeScript чистый. Нужно:
1. Получить API ключи и настроить `.env.local`
2. Запустить БД и тесты

## Порядок действий

### Шаг 1 — Минимальный запуск (только ChatGPT)
```bash
# .env.local — минимальный набор
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
TRIGGER_SECRET_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_SESSION_TOKEN=любой-uuid
INTERNAL_SECRET=любой-uuid
```

```bash
npx prisma db push
npx trigger.dev@latest dev   # в отдельном терминале
npm run dev                  # в отдельном терминале
```

### Шаг 2 — Открыть `/chat` и запустить первый аудит

### Шаг 3 — Добавлять ключи по одному (Gemini, Perplexity, DeepSeek)

### Шаг 4 — Получить YandexGPT и GigaChat ключи (см. SETUP.md)

## Нерешённые вопросы из бэклога
- [[Open Questions#payment]] — Stripe или ЮKassa?
- [[Open Questions#domain]] — какой домен для webapp?
- [[Open Questions#video]] — убрать "15-min video" с лендинга?

## Что осталось из кода (некритично)
- `/report/[id]/pdf` — print-friendly страница
- Live SSE вместо polling
- Авторизация клиента (после MVP)
