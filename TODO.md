# KaliGEO — Backlog

> Проверка репозитория: 2026-10-09. Старое утверждение об успешных тестах YandexGPT/Alisa не подтверждено: диагностика от 2026-09-23 в `vault/04-Backlog/Feature Backlog.md` фиксирует сетевые ошибки. Клиенты уже переведены на релей (коммит `bc3b3e2`); остаётся подтвердить развёртывание релея, переменные в Vercel/Trigger.dev и успешные ответы обеих моделей. GigaChat не настроен. Новые live-запросы при этой проверке не выполнялись.

## Решения 2026-10-23

- Применено аддитивное обновление рабочей БД: ServiceInquiry (RLS включён), снимки анализа и вопросы/ответы FreemiumScan, снимки анализа и вопросы AuditJob. Реальной проверкой gamepark.by подтверждено сохранение обращения, ниши, 3 вопросов и 6 ответов.
- Trigger.dev: опубликована production-версия `20261023.2`, 13 задач (https://cloud.trigger.dev/projects/v3/proj_xqiwghrbsmrggjmorcyh/deployments/7vfcza4m). Исправлены ссылки писем и сохранение анализа полного аудита.
- Vercel production: опубликован `dpl_AVNvzumNPoBFNfEix3unHikRHAqd` (https://vercel.com/1alexeikalinin1-3683s-projects/kaligeo-service/AVNvzumNPoBFNfEix3unHikRHAqd). Браузером подтверждены preview → pricing → order, все 6 тарифов и повтор оплаты без создания второго заказа (платёжные запросы перехвачены, реальной оплаты/рассылки не было). Финальный live-скан: https://app.kaligeo.by/preview/cmvkvk8d7000107jm2m0zg67m .
- Путь клиента: письмо → конкретный preview → pricing со scanId → order с выбранным тарифом → оплата → audit/id. Все измеренные платформы открыты. Исправлено игнорирование тарифа сервером, бесконечный прогресс завершённого аудита и предложение повторной покупки при сбое.
- Лендинги на основных доменах по HTTP фактически обслуживает nginx (hoster.by), несмотря на aliases в Vercel. Файлы landing/by/index.html и landing/ru/index.html исправлены (включая подписочные тарифы), но требуют отдельной загрузки на hoster.by. Доступа в текущей конфигурации нет.
- Проверки изменённого пути: 100 тестов, typecheck, целевой ESLint и production-сборка. Полный набор: 9 старых сбоев tests/integration/research/subscribe.test.ts — тест ожидает синхронный Resend, реализация запускает Trigger.dev; не исправлялось в рамках этого изменения.


- Vercel production: `dpl_ER77sepFuEZBDdmEW5HJTpiu9nth` опубликован, статус READY, привязан к `app.kaligeo.by`. Выпущены изменения первого письма (полный адрес в имени отправителя), форма обращений/API и анализ сайта OpenAI. Проверка: demo HTTP 200 с BYN, GET /api/inquiry → 405 (маршрут существует, требует POST). Статические файлы hoster.by этим выпуском не обновляются.

- Trigger.dev production: опубликована версия `20261023.1`, 13 задач. Deployment: https://cloud.trigger.dev/projects/v3/proj_xqiwghrbsmrggjmorcyh/deployments/5b6jqz9c . Включены изменения имени отправителя freemium-писем, анализа сайта через OpenAI и проверки ниши. Vercel и статический лендинг этим выпуском не обновляются.

- kaligeo.ru временно отключён по решению владельца. Проверки RU, сертификата, лендинга и эквайринга отложены до возобновления работы; не считать текущим блокером запуска BY.
- Перед возобновлением RU проверить HTTPS, доступность, RUB, документы и полный клиентский путь.
- Стоимость услуг указана с НДС — подтверждено владельцем; формулировку «НДС не облагается» в старых внутренних документах считать неактуальной.
- Бизнес без сайта: обращение через отдельную контактную форму с описанием услуг и ссылкой на соцсеть; автоматический аудит без подтверждённой ниши не запускать.
- В дальнейшем: отдельный ввод профиля без сайта, подтверждение географии и аудитории, поддержка источников из соцсетей (не обещать автоматический скан закрытых профилей).

## Актуализация 2026-10-09

- Исправлен жёстко заданный домен в пятом freemium-письме: ссылка и подпись берутся из рынка скана (BY/RU). Требуется выпуск обновлённого worker Trigger.dev.
- PowerPoint-экспорт (пункт 4) уже реализован: генератор, API и кнопка в ScoreHero.
- SEO metadata (пункт 10) уже есть на всех трёх перечисленных страницах; полнота og:image требует отдельной проверки.
- Отправка алертов (пункт 11) уже реализована в `trigger/monitoring-alerts.ts`; редактируемый порог всё ещё отсутствует.
- Дополнительно: привести cold/research nurture письма и monitoring alerts к общей BY/RU-конфигурации — там остаются фиксированные RU-домены/defaults.
- Записи ниже и старый vault-бэклог содержат исторические статусы; сверять с кодом перед началом работ.

---

## ✅ Закрыто сегодня (2026-06-23)

- Git-рассинхрон устранён, `origin/main` синхронен
- Удалены случайные файлы (`qa-*.png` × 6, PDF в `app/`)
- Исправлен баг-краш в `TrendsChart.tsx` (hooks вызывались после early return)
- Исправлена опечатка цены тарифа «Старт» на kaligeo.by (159 → 149 BYN)
- SEO-правки лендингов (гео-ключевики, LocalBusiness JSON-LD) закоммичены

## 🔴 P0 — Осталось одно ручное действие

### 0b. Залить обновлённые лендинги на hoster.by
- `landing/ru/index.html` и `landing/by/index.html` закоммичены с новыми гео-ключевиками (Москва, СПб, Минск и т.д.), но **ещё не на хостинге**
- Действие (вручную, пользователь делает сам): залить оба файла через FTP/панель hoster.by → переиндексация в GSC/Я.Вебмастер

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

## ✅ Закрыто с прошлой проверки

### 1. Юридические документы — готово
- `/legal/offer`, `/legal/privacy`, `/legal/returns`, `/legal/payment` — все 4 страницы живые на проде (200 OK), плюс статические `privacy.html` для hoster.by (ru+by)

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

### 6. ~~Мониторинг новых платформ~~ — проверено, работает
- Grok и DeepSeek подтверждены live-тестом 2026-06-23, оба отвечают (`status: ok`)

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
