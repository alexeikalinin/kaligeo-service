# Vercel Blob Setup

tags: #api-keys #setup #vercel #blob

**Нужен для:** Хранение PDF-отчётов (Standard+ тариф)  
**Бесплатно:** 1 GB хранилища  
**Требует:** Проект задеплоен на Vercel

---

## Шаг 1 — Задеплоить проект на Vercel

Если ещё не задеплоен:

```bash
npx vercel@latest
# Следовать инструкциям
```

Или через GitHub: **vercel.com/new** → импортировать репозиторий.

---

## Шаг 2 — Создать Blob Store

```
vercel.com → твой проект → вкладка "Storage"
→ "Create Database" → выбрать "Blob"
→ Имя: "kaligeo-reports"
→ Create
```

![[screenshots/vercel-blob-01-create.png]]
> *Storage → Create Database → Blob*

---

## Шаг 3 — Получить токен

```
Storage → kaligeo-reports → вкладка ".env.local"
→ Скопировать BLOB_READ_WRITE_TOKEN
```

![[screenshots/vercel-blob-02-token.png]]
> *Вкладка .env.local — готовые строки для копирования*

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_XXXXXXXXXXXXXXXXXX
```

---

## Шаг 4 — Добавить в .env.local

```bash
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
```

---

## Для локальной разработки без Vercel

Если не хочешь деплоить сразу — можно временно использовать локальное хранение файлов, но это потребует изменений в `render-pdf.ts`. Проще сразу задеплоить.

---

## Связанные заметки
- [[API Keys Overview]]
- [[Upstash Redis Setup]]
