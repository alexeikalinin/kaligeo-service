# ADR-002: AI SDK v6 Migration Notes

tags: #decision #ai-sdk #technical

**Дата:** 2026-05-01  
**Статус:** Принято

## Контекст

Проект использует `ai` пакет v6.0.172 (Vercel AI SDK).
v6 имеет breaking changes по сравнению с v3/v4.

## Ключевые изменения

### 1. useChat — новый API
```ts
// v3/v4 (старый)
useChat({ api: "/api/chat" })

// v6 (новый)
import { DefaultChatTransport } from "ai"
useChat({ transport: new DefaultChatTransport({ api: "/api/chat" }) })
```

### 2. Stream response
```ts
// v3/v4
result.toDataStreamResponse()

// v6
result.toUIMessageStreamResponse()
```

### 3. stopWhen вместо maxSteps
```ts
// v3/v4
streamText({ maxSteps: 10 })

// v6
streamText({ stopWhen: stepCountIs(10) })
```

### 4. Message format
```ts
// v6 — messages имеют parts[] вместо content: string
{ id, role, parts: [{ type: "text", text: "..." }] }
```

### 5. tool() overloads — Zod v4 issue
Из-за несовместимости типов Zod v4 в tool() overload resolution:
```ts
// Нужно использовать as any для tools в streamText
tools: { ... } as any
```

## Пакеты
- `ai@6.0.172` — основной
- `@ai-sdk/anthropic` — провайдер Claude
- `@ai-sdk/react` — useChat хук
