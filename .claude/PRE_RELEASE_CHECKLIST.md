# KaliGEO — Pre-Release Checklist

> Дата составления: 2026-05-22  
> Статус проекта: **~70% готов к production**

---

## 🔴 КРИТИЧЕСКИЕ блокеры (нельзя релизить без исправления)

### 1. Платёжный API не защищён
- **Файл**: `app/api/payment/create/route.ts`
- **Проблема**: Эндпоинт доступен без аутентификации. Клиент сам передаёт `amount` — сервер его не проверяет против таблицы цен. Любой может создать заказ на 1 копейку или на любую сумму.
- **Фикс**: Получать сумму из `TIER_CONFIG[plan].priceRub` на сервере, игнорировать клиентский `amount`. Добавить проверку `jobId` из базы.

### 2. Статус платежа не защищён  
- **Файл**: `app/api/payment/status/route.ts`
- **Проблема**: Нет аутентификации, нет привязки `orderId` к конкретному пользователю/сессии. Можно перебирать чужие `orderId`.
- **Фикс**: Привязать `orderId` к `AuditJob`, проверять `reportToken` при запросе статуса.

### 3. Tier выбирается клиентом при сабмите
- **Файл**: `app/api/audit/submit/route.ts`
- **Проблема**: `tier` приходит из body запроса. Клиент может запросить `ADVANCED` аудит, не заплатив за него — логика подтверждения оплаты (`/jobs/[id]/confirm`) существует, но если платёж обходится, tier уже сохранён в базе как ADVANCED.
- **Фикс**: Сохранять tier как `BASIC` по умолчанию при сабмите, а реальный tier проставлять только в `/confirm` (который защищён admin cookie). Либо добавить webhook от Альфа-банка с верификацией подписи.

### 4. Нет верификации Telegram webhook
- **Файл**: `app/api/telegram/webhook/route.ts`
- **Проблема**: Необходимо проверить, что запрос пришёл именно от Telegram (заголовок `X-Telegram-Bot-Api-Secret-Token`). Без проверки кто угодно может эмулировать команды бота.
- **Фикс**: При регистрации webhook передать `secret_token`, проверять его в каждом запросе.

---

## 🟡 ВЫСОКИЙ приоритет (исправить до релиза)

### 5. Admin auth — пароль = cookie value
- **Файл**: `app/api/admin/auth/route.ts`
- **Проблема**: `ADMIN_SESSION_TOKEN` используется и как пароль входа, и как значение `admin_session` cookie. Если cookie утечёт (XSS, logs) — злоумышленник получает прямой доступ.
- **Фикс**: Хранить в cookie подписанный JWT с `exp`, а `ADMIN_SESSION_TOKEN` использовать только как `JWT_SECRET`. Добавить rate limiting на `/api/admin/auth` (5 попыток/мин).

### 6. Нет rate limiting на freemium scan
- **Файл**: `app/api/freemium/scan/route.ts`
- **Проблема**: В отличие от `/audit/submit`, здесь нет Redis rate limiting. Endpoint запускает AI-агент (`runWebsiteAnalysisAgent`) — дорогостоящая операция.
- **Фикс**: Добавить такой же `checkRateLimit` как в `audit/submit` (5 req/час с IP).

### 7. Chat messages — token в body (не в header)
- **Файл**: `app/api/report/[id]/chat/route.ts`
- **Проблема**: `token` передаётся в JSON body. Если token хранится в localStorage (а не httpOnly cookie), он уязвим для XSS.
- **Фикс**: Передавать token через `Authorization: Bearer` header или проверить, что он хранится в sessionStorage с CSP.

### 8. Нет CSRF защиты на мутирующих эндпоинтах
- **Проблема**: Нет `SameSite=Strict` + CSRF токена на критичных POST-запросах (admin confirm, chat).
- **Фикс**: `SameSite=strict` на admin cookie (сейчас `lax`) — это минимум.

---

## 🟠 СРЕДНИЙ приоритет (можно выпустить с заметкой)

### 9. Error messages раскрывают детали системы
- **Файлы**: Большинство API routes
- **Проблема**: `console.error("Audit submit error:", error)` — в production логах Vercel будут видны детали ошибок Prisma (имена таблиц, поля). 
- **Фикс**: Отдельный error handler с generic messages для клиента, детали только в логах.

### 10. Отсутствует Content-Security-Policy header
- **Фикс**: Добавить в `next.config.ts` headers с CSP, X-Frame-Options, X-Content-Type-Options.

### 11. TypeScript `as never` каст в report data API
- **Файл**: `app/api/report/data/[id]/route.ts`, строки с `as never`
- **Проблема**: Подавление типов маскирует потенциальные несоответствия данных из Prisma.
- **Фикс**: Создать proper Zod-схему для данных отчёта.

### 12. Нет timeout на AI-запросы
- **Файлы**: `lib/ai-clients/*.ts`
- **Проблема**: Если внешний AI-провайдер завис, пайплайн ждёт до maxDuration (3600с).
- **Фикс**: AbortController с timeout 30–60с на каждый запрос к платформе.

---

## 🔵 НИЗКИЙ приоритет / Качество кода

### 13. `index-by.html` — устаревший файл?
- **Файл**: `landing/index-by.html`
- **Проблема**: В CLAUDE.md помечен как "устаревший?", нужно прояснить и удалить если не нужен.

### 14. Monitoring task в Trigger.dev
- **Файл**: `trigger/monitoring.ts`  
- **Нужно проверить**: Логика spot-check работает корректно, нет бесконечных циклов.

### 15. PDF генерация — нет fallback при ошибке
- **Файл**: `trigger/steps/render-pdf.ts`
- **Проблема**: Если PDF не сгенерировался, пайплайн должен завершиться успешно (PDF опционален для ряда тиров).

---

## ✅ Чеклист готовности по разделам

### Infrastructure
- [x] Neon Postgres настроен, schema задеплоена
- [x] Vercel Blob для PDF
- [x] Upstash Redis для rate limiting (но не везде применяется — см. #6)
- [x] Trigger.dev worker настроен
- [x] Resend для email
- [ ] Telegram webhook secret проверяется (#4)
- [ ] Мониторинг uptime (нет Sentry/Datadog)

### Security
- [ ] Payment amount validation (#1) 🔴
- [ ] Payment status auth (#2) 🔴
- [ ] Tier server-side enforcement (#3) 🔴
- [ ] Telegram webhook verification (#4) 🔴
- [ ] Admin auth hardening (#5) 🟡
- [ ] Rate limiting на все публичные AI-эндпоинты (#6) 🟡
- [ ] CSP headers (#10) 🟠

### Functional
- [x] Аудит-пайплайн (генерация запросов, выполнение, анализ)
- [x] PDF генерация
- [x] Email доставка
- [x] Freemium scan + lead capture
- [x] Report с токеном
- [x] Admin dashboard (confirm/reject оплата)
- [x] Telegram бот (воронка)
- [x] Тарифная система (3 разовых + 3 подписочных)
- [x] Post-audit chat
- [x] Share of Voice / Competitive Positioning
- [ ] Платёжная интеграция Альфа-банк BY — протестирована в production? 🟡
- [ ] Мониторинг-алерты (spot-check) — протестированы?

### Landing pages
- [x] kaligeo.ru (hoster.by)
- [x] kaligeo.by (hoster.by)
- [x] Цены синхронизированы между лендингом и ботом
- [ ] OG-теги и meta description актуальны

### Перед релизом — smoke tests
```bash
# 1. Freemium scan
curl -X POST https://kaligeo.ru/api/freemium/scan \
  -H "Content-Type: application/json" \
  -d '{"websiteUrl":"https://example.com"}'

# 2. Admin auth (нет brute force?)
curl -X POST https://kaligeo.ru/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password":"wrong"}'  # Должен вернуть 401

# 3. Payment create (проверить что без auth не принимает произвольную сумму)
curl -X POST https://kaligeo.by/api/payment/create \
  -H "Content-Type: application/json" \
  -d '{"plan":"BASIC","amount":1,"orderNumber":"test"}'

# 4. Report с неверным token (должен 401)
curl https://kaligeo.ru/api/report/data/some-id?token=wrong
```

---

## Оценка готовности к Production

| Область | Статус | Оценка |
|---------|--------|--------|
| Функциональность | ✅ Готово | 9/10 |
| Безопасность | ❌ Блокеры | 4/10 |
| Инфраструктура | ✅ Готово | 8/10 |
| Мониторинг/Observability | ⚠️ Минимально | 5/10 |
| Тестирование | ⚠️ Ручное | 5/10 |
| **Итого** | **⚠️ НЕ готов** | **6.2/10** |

### Минимальный путь к релизу (≈3–5 дней работы)

**День 1**: Закрыть #1, #2, #3 (платёжная безопасность)  
**День 2**: Закрыть #4, #5, #6 (auth + rate limiting)  
**День 3**: Тестирование payment flow в sandbox  
**День 4**: Smoke tests, CSP headers (#10)  
**День 5**: Deploy + мониторинг первые 24ч  

---

*Этот файл обновляется по мере закрытия пунктов. Запусти `/security-review` для детального анализа кода.*
