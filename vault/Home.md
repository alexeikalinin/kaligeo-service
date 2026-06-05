# KaliGEO — Knowledge Base

## Навигация

### Продукт
- [[01-Product/Product Vision]] — что мы строим и зачем
- [[01-Product/User Journey]] — флоу клиента от заявки до отчёта
- [[01-Product/Tiers & Features]] — что входит в каждый тариф

### Монетизация
- [[03-Monetization/Monetization Model]] — тарифы, ограничения, апсейл + Stitch-продукты
- [[03-Monetization/Freemium Strategy]] — freemium воронка и email capture
- [[03-Monetization/Post-Audit Chat]] — чат после аудита ✅ реализован
- [[03-Monetization/Lead Generation Strategy]] — каналы привлечения 3–10 заявок/день
- [[03-Monetization/Growth Strategy]] — стратегия продвижения, фазы, скрапинг → аудитории
- [[03-Monetization/Lead Magnets & Ad Copy]] — тексты писем, Яндекс.Директ, VK Ads, Look-alike
- [[03-Monetization/Advertising Playbook]] — техтребования платформ, готовые объявления, автоматизация заявок
- [[03-Monetization/Sales Strategy — Мнение и Синтез]] — ⭐ единый документ: freemium vs оплата, воронка, конверсия
- [[03-Monetization/Traffic & Funnel Strategy]] — ⭐ воронки по каждому источнику трафика, приоритеты конверсии

### Технический
- [[02-Technical/Architecture]] — компоненты и агенты
- [[02-Technical/Agent System]] — кто за что отвечает
- [[02-Technical/AI Platforms]] — 8 платформ и их особенности
- [[02-Technical/AI Clients Testing]] — порядок тестирования

### API Ключи (инструкции)
- [[07-API-Keys/API Keys Overview]] — статус всех ключей + шаблон .env.local
- [[07-API-Keys/Anthropic API Key]]
- [[07-API-Keys/Google Gemini API Key]]
- [[07-API-Keys/Perplexity API Key]]
- [[07-API-Keys/DeepSeek API Key]]
- [[07-API-Keys/YandexGPT API Key]] — также для Алисы
- [[07-API-Keys/GigaChat API Key]] ⚠️ самый сложный
- [[07-API-Keys/Neon Database Setup]]
- [[07-API-Keys/Trigger.dev Setup]]
- [[07-API-Keys/Resend API Key]]
- [[07-API-Keys/Vercel Blob Setup]]
- [[07-API-Keys/Upstash Redis Setup]]

### Контент и публикации
- [[08-Content/Content Strategy|🗺️ Content Strategy]] — **стратегия продвижения**, контент-план, KPI, площадки
- [[08-Content/articles/README|📝 Статьи-сравнения]] — 6 готовых обзоров GEO-инструментов (vc.ru, Habr, dev.by, sostav.ru, TenChat, Spark)

### Клиенты и ниши
- [[06-Clients/Clients Index]] — все аудиты по нишам
- `/vault-add-audit <jobId>` — добавить аудит в vault
- `/vault-analyze-niche <ниша>` — анализ ниши

### Бэклог
- [[04-Backlog/Feature Backlog]] — все идеи и отложенные задачи
- [[04-Backlog/Open Questions]] — нерешённые вопросы

### Решения
- [[05-Decisions/ADR-001 PDF Strategy]]
- [[05-Decisions/ADR-002 AI SDK v6]]

---

## Следующие шаги

### 🔴 Сделать прямо сейчас
1. Получить API ключи по инструкциям в папке `07-API-Keys`
2. Заполнить `.env.local` в проекте
3. `npx prisma db push` — создать таблицы
4. `npx trigger.dev@latest dev` — запустить воркер
5. `npm run dev` — запустить проект
6. Открыть `/chat` и сделать первый тестовый аудит

### 🟡 После первого успешного аудита
- Проверить каждую платформу по очереди
- Добавить скриншоты в папку `assets/screenshots`
- Запустить аудит по всем тарифам (Basic, Standard, Advanced)
- Протестировать post-audit chat

### 🟢 Следующие фичи
- Деплой на Vercel
- Настройка домена
- Страница `/report/[id]/pdf` (print версия)
- Live SSE вместо polling

---
*Последнее обновление: 2026-05-22*
