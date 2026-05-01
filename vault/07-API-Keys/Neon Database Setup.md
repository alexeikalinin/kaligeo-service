# Neon Database (PostgreSQL)

tags: #api-keys #setup #database #neon

**Нужен для:** Хранение AuditJob, QueryResult, Report  
**Бесплатно:** 0.5 GB хранилища, 1 проект — достаточно для старта  
**Особенность:** Serverless PostgreSQL, идеально для Vercel

---

## Шаг 1 — Создать аккаунт

Перейти: **https://neon.tech**

```
"Sign up" → войти через GitHub (рекомендуется) или email
```

![[screenshots/neon-01-signup.png]]

---

## Шаг 2 — Создать проект

```
"Create a project"
→ Project name: "kaligeo"
→ Database name: "kaligeo"
→ Region: "EU Frankfurt" (ближе к RU) или "US East"
→ "Create project"
```

![[screenshots/neon-02-create.png]]
> *Форма создания проекта — выбрать регион EU Frankfurt*

---

## Шаг 3 — Скопировать строки подключения

После создания проекта Neon покажет **Connection Details**:

```
Вкладка "Connection Details"
→ Connection string → скопировать первую строку
```

![[screenshots/neon-03-connection.png]]
> *Раздел Connection Details — два варианта строки подключения*

Нужно скопировать **две строки:**

**DATABASE_URL** (pooled connection — для Prisma в продакшене):
```
postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/kaligeo?sslmode=require
```

**DIRECT_URL** (direct connection — для Prisma Migrate):
```
postgresql://user:password@ep-xxx.eu-central-1.aws.neon.tech/kaligeo?sslmode=require
```

> В Neon они часто совпадают. Если есть "Pooled" и "Unpooled" — используй Pooled для DATABASE_URL и Unpooled для DIRECT_URL.

---

## Шаг 4 — Добавить в .env.local

```bash
DATABASE_URL=postgresql://user:password@ep-xxx...neon.tech/kaligeo?sslmode=require
DIRECT_URL=postgresql://user:password@ep-xxx...neon.tech/kaligeo?sslmode=require
```

---

## Шаг 5 — Создать таблицы

После добавления строк в .env.local:

```bash
npx prisma db push
```

Ожидаемый вывод:
```
✔ Generated Prisma Client
✔ Your database is now in sync with your Prisma schema.
```

---

## Связанные заметки
- [[API Keys Overview]]
- [[Trigger.dev Setup]]
