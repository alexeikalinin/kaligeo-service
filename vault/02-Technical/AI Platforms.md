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

## Нереализованные

| Платформа | Проблема | Решение |
|---|---|---|
| Алиса | Нет публичного chat API | Уточнить требования — [[Open Questions#alisa]] |

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
