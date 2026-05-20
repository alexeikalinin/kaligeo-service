# AI Platforms

tags: #technical #platforms #api

## Реализованные платформы

| Платформа | Файл | API | Модель | Статус |
|---|---|---|---|---|
| ChatGPT | `openai.ts` | OpenAI SDK | gpt-4o | ✅ |
| Claude | `anthropic.ts` | Anthropic SDK | claude-sonnet-4-6 | ✅ |
| Gemini | `gemini.ts` | @google/generative-ai | gemini-2.0-flash | ✅ |
| Perplexity | `perplexity.ts` | raw fetch | sonar-pro | ✅ |
| DeepSeek | `deepseek.ts` | OpenAI-compat | deepseek-chat | ✅ |
| YandexGPT | `yandexgpt.ts` | raw fetch | yandexgpt/latest | ✅ (не тест.) |
| GigaChat | `gigachat.ts` | OAuth + fetch | GigaChat | ✅ (не тест.) |
| Grok | `grok.ts` | OpenAI SDK (baseURL x.ai) | grok-3 | ✅ |

## Нереализованные / в плане

| Платформа | Сложность | Почему важна | Статус |
|---|---|---|---|
| Алиса | Высокая | Нет публичного chat API | Заморожено |
| Microsoft Copilot | Высокая | Встроен в Windows/Office/Edge — огромный охват | В плане |
| Meta AI | Средняя | Встроен в WhatsApp/Instagram/Facebook | В плане |
| Mistral Le Chat | Низкая | Топ Европа, простой REST API | В плане |

## Grok — как получить ключ

1. Зайти на https://console.x.ai
2. Создать аккаунт (требует аккаунт X/Twitter)
3. `API Keys` → `Create API Key`
4. Добавить в `.env`:
   ```
   GROK_API_KEY=xai-...
   ```
5. `npx prisma db push` — уже не нужно, `GROK` добавлен в schema
6. Запустить `npm run dev` и проверить в `/admin/usage` — Grok должен появиться в активных платформах

API совместим с OpenAI SDK — просто другой `baseURL: "https://api.x.ai/v1"` и модель `grok-3`.

## Microsoft Copilot — почему сложнее

Copilot это **не одна модель**, а продукт поверх GPT-4o (через Azure OpenAI). Нет прямого "Copilot API" для чата.

**Варианты интеграции:**

| Вариант | Что нужно | Сложность |
|---|---|---|
| Azure OpenAI API | Azure аккаунт + отдельный ключ, но это просто GPT-4o. Не "настоящий Copilot" — без веб-поиска и персонализации | Средняя |
| Microsoft Copilot Studio | Корпоративная подписка M365, Bot Framework SDK, webhook-архитектура | Высокая |
| Copilot Chat API (preview) | Требует M365 Business лицензию + Graph API scope `CopilotChat.ReadWrite` | Высокая |

**Вывод:** если цель — аудит, то Azure OpenAI (=GPT-4o) даст те же ответы, что Copilot. Это не честный аудит именно Copilot. Пока не стоит.

## Распределение по тарифам (актуально)

## Особенности

### GigaChat — TLS проблема
Sber использует российский CA. В коде:
```ts
// gigachat.ts — только для OAuth вызова
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
// Восстанавливается сразу после вызова
```

### Perplexity — citations
Perplexity возвращает `citations` отдельным полем в ответе, но мы парсим URL из текста.
Нужно обновить клиент для правильной обработки источников.

### YandexGPT — срок токенов
Api-Key не истекает. IAM-токены истекают за 12 часов.
Мы используем Api-Key — проблем нет.

## Распределение по тарифам

### Basic (3 платформы)
- ChatGPT — самая важная для западной аудитории
- Gemini — Google AI Overviews
- YandexGPT — русскоязычная аудитория

### Standard (6 платформ)
- + Claude, Perplexity, DeepSeek

### Advanced (8 платформ)
- + GigaChat, Алиса (когда будет реализована)

### Advanced (9 платформ)
- + GigaChat, Алиса, **Grok**

## Где изменить распределение

`lib/ai-clients/index.ts` → `TIER_PLATFORMS` (нужно добавить):
```ts
export const TIER_PLATFORMS = {
  BASIC: ["CHATGPT", "GEMINI", "YANDEXGPT"],
  STANDARD: ["CHATGPT", "GEMINI", "YANDEXGPT", "CLAUDE", "PERPLEXITY", "DEEPSEEK"],
  ADVANCED: Object.keys(AI_CLIENTS), // все
}
```

## Связанные заметки
- [[Agent System]] — как платформы используются в пайплайне
- [[Monetization Model]] — тарифы
- [[Feature Backlog#alisa]] — нереализованная Алиса
