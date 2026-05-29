# KaliGEO — Backlog

> Обновлён: 2026-05-29. Актуальный статус после двух сессий.

---

## ✅ Реализовано (полный список)

**Ядро продукта**
- Аудит-пайплайн (Trigger.dev, 9 платформ), агенты, отчёт (10 вкладок)
- Freemium flow: domain-check → scan → preview
- Post-audit chat (AI SDK v6)
- Website Fix Agent, Risk Agent
- Admin dashboard + usage stats
- PDF генерация (Vercel Blob) + HTML download

**Личный кабинет `/my/`**
- Magic-link auth (Client + MagicLinkToken + CLIENT_SESSION_SECRET ✅ в Vercel)
- Dashboard, History, Brands, Sources, Billing, Settings, Audits detail
- Brand role stats (PRIMARY/ALTERNATIVE/MENTION) в ScoreHero

**Аналитика**
- Citation Readiness Score (3 субскора + cap)
- Entity Recognition weak points per platform
- Veto/Cap система скоринга
- Per-platform GEO матрица в агентах, risk gates

**Email-система**
- Freemium sequence: 5 писем (F-1 с таблицей платформ, F-3 с реальными конкурентами, F-5 re-engagement)
- Post-audit sequence: Trial (T-2,T-3,T-4), Basic (B-2,B-3), Standard/Advanced (SA-2,SA-3,SA-4)
- Monitor monthly digest (12 ротируемых GEO-советов)
- Renewal reminder (за 7 дней до конца подписки)
- Monitoring alerts (weekly, при падении score > 10)
- Report email с quickWins для STANDARD+

**Монетизация**
- Alfa-Bank (BYN + RUB, sandbox + prod)
- Trial flow: /api/client/auth/trial, trialUsed в schema

**Лендинги**
- ru + by: обновлены (новые секции, скомбинированный hero)
- /pricing, /tools/domain-check, /research-2026 (PDF лид-магнит)

**Env vars (Vercel production) — всё настроено ✅**
- OPENAI, ANTHROPIC, GOOGLE_AI, DEEPSEEK, YANDEXGPT, PERPLEXITY, GIGACHAT — все ключи
- GROK_API_KEY (добавлен 3 дня назад)
- DATABASE_URL + DIRECT_URL (Supabase)
- BLOB_READ_WRITE_TOKEN, UPSTASH_REDIS, RESEND_API_KEY
- TRIGGER_SECRET_KEY, ADMIN_SESSION_TOKEN, CLIENT_SESSION_SECRET
- TELEGRAM (ADMIN_TELEGRAM_BOT_TOKEN + ADMIN_TELEGRAM_CHAT_ID)
- ALFABANK (RU + BY, callback tokens)

---

## 🔴 P0 — Блокирует продажи

### 1. Юридические документы *(другой чат)*
- `content/legal/offer.mdx` — публичная оферта (152-ФЗ)
- `content/legal/privacy.mdx` — политика конфиденциальности
- `content/legal/terms.mdx` — условия использования
- `content/legal/refund.mdx` — возврат (14 дней)
- Инфраструктура `/legal/[slug]/page.tsx` уже есть

---

## 🟠 P1 — Важно для продукта

### 2. GigaChat — протестировать реальную работу
- Ключи (`GIGACHAT_CLIENT_ID`, `GIGACHAT_CLIENT_SECRET`) уже в Vercel с 11-го дня
- Нужно: запустить тестовый аудит с GigaChat и проверить что ответы приходят
- Если не работает — отладить TLS/OAuth (было `NODE_TLS_REJECT_UNAUTHORIZED=0`)

### 3. PDF лид-магнит — загрузить файл в Blob
- Страница `/research-2026` уже есть (Research2026Form.tsx)
- Нужно: сверстать PDF (18 страниц, контент в vault/08-Content/articles/2026-08/2026-08-25--pdf--)
  и загрузить в Vercel Blob — BLOB_READ_WRITE_TOKEN уже настроен

---

## 🟡 P2 — Улучшения

### 4. .pptx генерация отчёта
- `lib/report/pptx-gen.ts` — pptxgenjs, 6-8 слайдов
- `GET /api/report/[id]/download-pptx`
- Кнопка в ScoreHero рядом с PDF и HTML

### 5. Monitoring alerts — настройки в БД
- Сейчас порог (10 пунктов) захардкожен
- `ClientAlertSettings` модель в Prisma: threshold, channels (email/telegram), frequency
- UI в `/my/settings` уже готов, нужно добавить редактируемые поля

### 6. Мониторинг новых платформ
- Grok API ключ добавлен в Vercel — нужно проверить что интеграция работает
- DeepSeek — проверить что запросы идут

---

## 🟢 P3 — Международный выход (отдельный спринт)

### 7. Stripe + EN лендинг
- `landing/en/index.html` — английская версия под kaligeo.com
- `app/api/payment/stripe/create/route.ts` + webhook
- USD цены: BASIC $49 / STANDARD $129 / ADVANCED $249
- Подписки: $29/$99/$199
- EN версии email-шаблонов

---

## 📝 Контент (публикация когда сервис готов)

| Дата | Материал | Статус |
|------|----------|--------|
| 11.08 | Telegram нативные посты (x5 каналов) | Тексты готовы |
| 18.08 | YouTube видео-разбор | Скрипт готов |
| 25.08 | PDF лид-магнит | Контент готов, нужна вёрстка |

---

## ❓ Открытые вопросы

1. **Stripe домен** — отдельный kaligeo.com или мультиязычный на текущем?
2. **Trial CTA** — показывать TrialForm на лендинге или только в ЛК?
3. **GigaChat** — работают ли ключи в продакшне или только в sandbox?
