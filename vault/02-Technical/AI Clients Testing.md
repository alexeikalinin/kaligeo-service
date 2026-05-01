# AI Clients Testing Guide

tags: #technical #testing #platforms

## Порядок подключения и тестирования

Тестируй по одной платформе за раз. Для каждой: получить ключ → добавить в `.env.local` → запустить `npm run dev` → выполнить тест-запрос.

---

## 1. OpenAI (ChatGPT) — начать здесь

**Ключ:** https://platform.openai.com → API keys → Create

```bash
OPENAI_API_KEY=sk-...
```

**Тест в браузере (после `npm run dev`):**
```
POST http://localhost:3000/api/audit/submit
{
  "companyName": "Test",
  "websiteUrl": "https://test.com",
  "niche": "тестовая ниша для разработки",
  "clientEmail": "test@test.com",
  "tier": "BASIC"
}
```

Или через `/admin/submit` форму.

**Ожидаемый результат:** `{ jobId: "..." }` — задание в БД со статусом PENDING.

---

## 2. Anthropic (Claude)

**Ключ:** https://console.anthropic.com → API Keys

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**Тест чата:** Открыть `/chat` в браузере → написать сообщение.

---

## 3. Google (Gemini)

**Ключ:** https://aistudio.google.com → Get API Key

```bash
GOOGLE_AI_API_KEY=AIza...
```

---

## 4. Perplexity

**Ключ:** https://perplexity.ai/settings/api → Generate

```bash
PERPLEXITY_API_KEY=pplx-...
```

---

## 5. DeepSeek

**Ключ:** https://platform.deepseek.com → API Keys

```bash
DEEPSEEK_API_KEY=sk-...
```

---

## 6. YandexGPT + Alisa (один ключ для обоих)

См. `SETUP.md` раздел YandexGPT.

```bash
YANDEXGPT_API_KEY=AQVN...
YANDEX_FOLDER_ID=b1g...
```

**Особенность:** Alisa использует те же ключи, модель `yandexgpt-lite`.

---

## 7. GigaChat

См. `SETUP.md` раздел GigaChat.

```bash
GIGACHAT_CLIENT_ID=...
GIGACHAT_CLIENT_SECRET=...
```

**Известная проблема:** TLS от Sber — код уже обходит через
`NODE_TLS_REJECT_UNAUTHORIZED=0` только для OAuth-вызова.

---

## Полный тест пайплайна

После того как все ключи добавлены:

1. Запустить `npx prisma db push` (один раз)
2. Запустить Trigger.dev: `npx trigger.dev@latest dev`
3. Запустить Next.js: `npm run dev`
4. Открыть `/admin/submit` → создать тестовый аудит:
   - companyName: любое
   - tier: STANDARD (6 платформ)
5. Перейти на `/admin/jobs/{id}` → следить за stepper
6. Проверить Trigger.dev dashboard → Run logs
7. При COMPLETED → открыть отчёт → проверить данные

## Что проверять в каждой платформе

В Trigger.dev logs для каждой платформы:
- Нет ошибок (timeout, auth, rate limit)
- Response не пустой
- `brandMentioned` корректно определяется
- `sentiment` не всегда "absent"

## Известные возможные проблемы

| Платформа | Проблема | Решение |
|---|---|---|
| Perplexity | `sonar-pro` может быть недоступен без Pro подписки | Заменить на `sonar` в `lib/ai-clients/perplexity.ts` |
| GigaChat | TLS ошибка при OAuth | Уже обходится в коде |
| YandexGPT | Квота на запросы | Бесплатный уровень = 1M токенов/день |
| OpenAI | Rate limit | В `execute-queries.ts` уже есть 300ms delay |
