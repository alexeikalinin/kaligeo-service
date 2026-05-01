# Upstash Redis Setup

tags: #api-keys #setup #upstash #redis

**Нужен для:** Rate limiting на `/api/audit/submit` (3 аудита/час/IP)  
**Бесплатно:** 10,000 команд/день — достаточно для старта  
**Без него:** Rate limiting отключен (код падает open — аудиты запускаются без ограничений)

---

## Шаг 1 — Создать аккаунт

Перейти: **https://upstash.com**

```
"Start for Free" → войти через GitHub или email
```

![[screenshots/upstash-01-signup.png]]

---

## Шаг 2 — Создать базу Redis

```
"Create Database"
→ Имя: "kaligeo-ratelimit"
→ Type: "Regional"
→ Region: "EU-West-1" (Frankfurt) или ближайший
→ "Create"
```

![[screenshots/upstash-02-create.png]]
> *Create Database → выбрать Regional, регион EU*

---

## Шаг 3 — Скопировать ключи

```
Открыть созданную БД
→ Раздел "REST API" (или вкладка "Details")
→ Скопировать:
  - UPSTASH_REDIS_REST_URL
  - UPSTASH_REDIS_REST_TOKEN
```

![[screenshots/upstash-03-keys.png]]
> *Раздел REST API — готовые строки для .env*

```
UPSTASH_REDIS_REST_URL=https://us1-xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Шаг 4 — Добавить в .env.local

```bash
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=AX...
```

---

## Связанные заметки
- [[API Keys Overview]]
