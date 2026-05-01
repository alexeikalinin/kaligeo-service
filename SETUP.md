# KaliGEO — Setup Guide

## Quick Start

```bash
cp .env.example .env.local
npm install
npx prisma generate
npx prisma db push
npm run dev
```

---

## API Keys Setup

### 1. OpenAI (ChatGPT + query generation)
1. Перейти на **platform.openai.com**
2. API keys → Create new secret key
3. Скопировать в `OPENAI_API_KEY`

### 2. Anthropic (Claude)
1. Перейти на **console.anthropic.com**
2. API Keys → Create Key
3. Скопировать в `ANTHROPIC_API_KEY`

### 3. Google Gemini
1. Перейти на **aistudio.google.com**
2. Get API Key → Create API key
3. Скопировать в `GOOGLE_AI_API_KEY`

### 4. Perplexity
1. Перейти на **perplexity.ai/settings/api**
2. Generate → скопировать в `PERPLEXITY_API_KEY`

### 5. DeepSeek
1. Перейти на **platform.deepseek.com**
2. API keys → Create API key
3. Скопировать в `DEEPSEEK_API_KEY`

### 6. YandexGPT ⭐

1. Зарегистрироваться/войти на **console.yandex.cloud**
2. Создать платёжный аккаунт (если нет)
3. Создать **folder** (папку) — запомнить ID из URL (`/folders/b1g...`)
4. Перейти в folder → **IAM** → **Сервисные аккаунты** → Создать
   - Роль: `ai.languageModels.user`
5. Открыть сервисный аккаунт → **API-ключи** → Создать API-ключ
6. Скопировать ключ в `YANDEXGPT_API_KEY`
7. Folder ID (из шага 3) скопировать в `YANDEX_FOLDER_ID`

Тарифы: **YandexGPT Lite** — бесплатно до 1M токенов/день в тестовом режиме.

### 7. GigaChat (Sber) ⭐

1. Перейти на **developers.sber.ru/gigachat**
2. Нажать **"Подключить"** → авторизоваться через Сбер ID
3. В личном кабинете: **Мои проекты** → Создать проект
   - Выбрать **GigaChat API**
   - Тариф: **Физ. лицо (GIGACHAT_API_PERS)** — есть бесплатный лимит
4. В настройках проекта: скопировать **Client ID** → `GIGACHAT_CLIENT_ID`
5. Нажать **Сгенерировать секрет** → скопировать в `GIGACHAT_CLIENT_SECRET`

⚠️ **Важно по TLS:** Sber использует российский корневой сертификат (Минцифры CA).
В коде для OAuth-вызова используется обход (`NODE_TLS_REJECT_UNAUTHORIZED=0`).
Это ограничено только одной функцией и не влияет на остальные соединения.

---

## Infrastructure Setup

### Neon Postgres
1. **neon.tech** → New project
2. Dashboard → Connection string → скопировать в `DATABASE_URL`
3. Connection string (direct) → `DIRECT_URL`

### Vercel Blob
1. Vercel Dashboard → Storage → Create → Blob Store
2. `.env.local` → скопировать `BLOB_READ_WRITE_TOKEN`

### Resend (email)
1. **resend.com** → API Keys → Create
2. Скопировать в `RESEND_API_KEY`
3. Добавить и верифицировать домен отправителя → `FROM_EMAIL`

### Trigger.dev
1. **trigger.dev** → New project
2. Environments & API Keys → скопировать в `TRIGGER_SECRET_KEY`
3. Запустить воркер: `npx trigger.dev@latest dev`

### Admin
Генерируйте случайные значения для `ADMIN_SESSION_TOKEN` и `INTERNAL_SECRET`:
```bash
node -e "console.log(require('crypto').randomUUID())"
```
