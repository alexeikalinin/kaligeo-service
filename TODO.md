# KaliGEO — Backlog

> Обновлён: 2026-06-02. Все 8 платформ работают, ключи обновлены, готовимся к первым аудитам.

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
- OPENAI, ANTHROPIC, GOOGLE_AI, DEEPSEEK, YANDEXGPT, PERPLEXITY, GROK — все ключи обновлены 2026-06-02 ✅
- GIGACHAT — удалён (нет аккаунта)
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

### 2. GigaChat — подключить когда появится аккаунт Sber
- Аккаунта нет, ключи удалены из Vercel
- Когда будет: добавить `GIGACHAT_CLIENT_ID` + `GIGACHAT_CLIENT_SECRET`, OAuth через TLS-bypass уже реализован

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

## 🔵 P2 — Добавлено 2026-06-02

### 8. Email-кампании — кнопка запуска из админки
- Страница `/admin/leads` показывает кампании, данные есть
- Нужно: кнопка «Запустить кампанию» → `POST /api/leads/campaign/start`
- Логика старта уже есть в `app/api/leads/campaign/start/route.ts`

### 9. Онбординг после оплаты
- После `paidAt` нет welcome-письма с инструкцией «что дальше»
- Нужно: письмо с ссылкой на отчёт + как читать результаты + следующие шаги

### 10. SEO мета-теги для app.kaligeo.ru
- `app/layout.tsx` — базовые теги есть, но страницы отчётов/дашборда без og:image
- Нужно: `metadata` на `/pricing`, `/report/demo`, `/tools/domain-check`

### 11. Алерты мониторинга — логика отправки
- `hasMonitoringAlerts: true` в gates для MONITOR_PRO/AGENT
- Нужно: задача Trigger.dev, которая сравнивает score с прошлым аудитом и шлёт письмо при падении > 10 пунктов

---

## ❓ Открытые вопросы

1. **Stripe домен** — отдельный kaligeo.com или мультиязычный на текущем?
2. **Trial CTA** — показывать TrialForm на лендинге или только в ЛК?
