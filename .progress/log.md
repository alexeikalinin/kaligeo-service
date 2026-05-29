# KaliGEO Progress Log

## Session 2026-05-27 — Конкурентный анализ VisioBrand + Roadmap личного кабинета

### Context
Сессия стратегического планирования. Код не менялся. Проанализирован ближайший конкурент VisioBrand (visiobrand.io), составлен детальный roadmap развития сервиса: личный кабинет для подписчиков, триальный доступ, юридические документы, EN-версия + Stripe.

### Completed
- [x] Анализ VisioBrand: главная страница + страница оферты (через WebFetch)
- [x] Сравнительная таблица KaliGEO vs VisioBrand (преимущества и отставания)
- [x] Roadmap по 4 спринтам сохранён в план файл
- [x] Заметка сохранена в Obsidian: `vault/01-Product/VisioBrand-Analysis-and-Roadmap.md`

### Key Decisions
- **Личный кабинет** — приоритет #1, авторизация через magic-link (email → одноразовая ссылка)
- **Trial** — 1 полный BASIC-аудит бесплатно при регистрации (не 5-дневный период как у VisioBrand)
- **Роль бренда** — добавить классификацию `PRIMARY / ALTERNATIVE / MENTION` в `QueryResult`
- **Юридические документы** — создать `/legal/offer`, `/legal/privacy`, `/legal/terms`, `/legal/refund` как Next.js-страницы
- **EN + Stripe** — Sprint 4, отдельный домен `kaligeo.com`, USD цены ($49/$129/$249)
- **VisioBrand UX-research** — если владелец зарегистрируется, Claude войдёт через Playwright MCP и изучит дашборд

### Sprint Plan (утверждён)
1. **Sprint 1 (2-3 нед):** Юр. документы + Magic-link auth + базовый `/dashboard`
2. **Sprint 2 (3-4 нед):** Полный личный кабинет + классификация роли бренда
3. **Sprint 3 (2-3 нед):** Trial flow + HTML-скачивание + .pptx презентация
4. **Sprint 4 (4-6 нед):** EN лендинг + Stripe + USD

### Next Steps (с чего начать завтра)
1. **Юридические документы** — написать тексты оферты/политики, создать `app/legal/[slug]/page.tsx`
2. **Prisma** — добавить модель `UserSession { id, email, token, expiresAt, createdAt }`
3. **Magic-link auth** — `POST /api/auth/magic-link` + `GET /api/auth/verify?token=` + Resend письмо
4. **Middleware** — защита `/dashboard/*` через сессионную куку
5. **`/dashboard` страница** — список аудитов клиента по email, статусы, ссылки на отчёты

### In Progress
- [ ] Личный кабинет — проектирование начато, реализация завтра
- [ ] Триальный доступ — решение принято, реализация в Sprint 3

### Открытые вопросы
- Регистрируемся на VisioBrand для изучения UX дашборда?
- Magic-link или добавляем OAuth (Google/Yandex)?
- Stripe: отдельный kaligeo.com или мультиязычный на текущем домене?
- Оферту пишем сами по шаблону VisioBrand или нужен юрист?

## Session 2026-05-25 — Контент Волна 3 (август)

### Context
Проект задеплоен на Vercel, полный продукт в продакшне. state.json был сильно устарелым (последнее обновление 2026-05-02). 
Текущая фаза: написание контента Волна 3 — август 2026.
Волны 1 (июнь) и 2 (июль) — 12 статей — уже готовы.

### Completed
- [x] Статья 04.08 vc.ru: «Состояние GEO в России: что изменилось за лето 2026» — исследовательский материал с данными, метриками, трендами, CTA на PDF лид-магнит
- [x] Статья 05.08 Habr: «Как мы строили GEO-аудитор: архитектура, ошибки и уроки» — технический постмортем (стек, пайплайн, AI-клиенты, Trigger.dev, agents, PDF, ошибки)
- [x] Статья 12.08 sostav.ru: «GEO-метрики для маркетолога: что ставить в KPI» — методология, шаблон отчёта, 5 метрик (SoV, Coverage Rate, Sentiment, CDI, Query Coverage)
- [x] Обновлён README.md статей — статусы 04.08, 05.08, 12.08 → готово
- [x] Обновлён Editorial Calendar — статусы обновлены, добавлены ссылки
- [x] Обновлён state.json — фаза CONTENT, актуальный список pendingFiles

### Pending (август)
- [ ] 11.08 — Telegram нативные посты (x5 каналов)
- [ ] 18.08 — YouTube скрипт видео-разбора аудита
- [ ] 19.08 — TenChat: итоги лета (короткий пост)
- [ ] 25.08 — PDF лид-магнит «Состояние GEO в России 2026»
- [ ] Landing page /research-2026 для получения PDF



## Session 2026-05-01 — Full implementation

### Context
Проект: AI-аудит видимости бренда в 7 LLM-платформах.
Бэкенд-пайплайн (Trigger.dev, 5 платформ) был готов. Реализовано всё по плану.

### Completed
- [x] `.progress/state.json` + `.progress/log.md`
- [x] `.claude/commands/resume.md`
- [x] `.claude/commands/log-progress.md`
- [x] `.claude/commands/add-ai-client.md`
- [x] `.claude/commands/test-pipeline.md`
- [x] `.claude/commands/check-types.md`
- [x] `.claude/commands/update-env.md`
- [x] `.env.example`
- [x] `SETUP.md` (инструкции по YandexGPT, GigaChat, и всей инфраструктуре)
- [x] `lib/ai-clients/yandexgpt.ts`
- [x] `lib/ai-clients/gigachat.ts` (с OAuth token cache, TLS workaround)
- [x] `lib/ai-clients/index.ts` (обновлён — 7 платформ)
- [x] `prisma.config.ts` (Prisma 7 migration)
- [x] `prisma/schema.prisma` (убраны url/directUrl — требование Prisma 7)
- [x] `lib/prisma.ts` (Prisma 7 + PrismaNeon adapter)
- [x] `components/pdf/ReportPDFDocument.tsx` (@react-pdf/renderer)
- [x] `app/api/report/generate-pdf/route.ts`
- [x] `trigger/steps/render-pdf.ts` (обновлён — jobId вместо reportUrl)
- [x] `app/api/chat/route.ts` (Vercel AI SDK v6, streamText, tool)
- [x] `app/chat/page.tsx` (чат UI, DefaultChatTransport)
- [x] `app/chat/layout.tsx`
- [x] `app/audit/[id]/page.tsx` (статус с polling, stepper)
- [x] `app/page.tsx` (redirect → /chat)
- [x] `components/report/ScoreHero.tsx`
- [x] `components/report/PlatformScoreCard.tsx`
- [x] `components/report/PlatformScoresGrid.tsx`
- [x] `components/report/CompetitorMatrixTable.tsx`
- [x] `components/report/WeakPointsList.tsx`
- [x] `components/report/ActionPlanTimeline.tsx`
- [x] `components/report/QueryExplorer.tsx`
- [x] `components/report/ReportDashboard.tsx`
- [x] `app/report/[id]/page.tsx` + `loading.tsx` + `error.tsx`
- [x] `app/api/admin/auth/route.ts`
- [x] `app/admin/login/page.tsx`
- [x] `app/admin/layout.tsx` (cookie auth gate)
- [x] `app/admin/page.tsx` (jobs dashboard)
- [x] `app/admin/submit/page.tsx`
- [x] `app/admin/jobs/[id]/page.tsx` (live stepper)
- [x] `lib/agents/analysis-agent.ts`
- [x] `lib/agents/content-agent.ts`
- [x] `lib/agents/report-agent.ts`
- [x] `lib/agents/index.ts` (dispatchTool)
- [x] `lib/agents/orchestrator.ts` (tool_use loop)
- [x] `app/api/admin/agents/route.ts`
- [x] TypeScript: `npx tsc --noEmit` — **0 ошибок**

### Vault Skills добавлены
- [x] `.claude/commands/vault-add-audit.md` — `/vault-add-audit <jobId>`
- [x] `.claude/commands/vault-analyze-niche.md` — `/vault-analyze-niche <ниша>`
- [x] `.claude/commands/vault-niche-context.md` — `/vault-niche-context <ниша> <компания>`
- [x] `vault/06-Clients/` — структура для клиентов по нишам
- [x] `vault/07-API-Keys/` — инструкции по всем 9 API ключам со скринами

### Next Steps (после получения API keys и настройки .env.local)
1. Запустить `npx prisma db push` для создания таблиц
2. Проверить `/chat` flow end-to-end
3. Настроить Trigger.dev и запустить воркер
4. Получить ключи YandexGPT (Yandex Cloud) и GigaChat (developers.sber.ru) — см. SETUP.md
5. Добавить брендбук в `components/pdf/ReportPDFDocument.tsx` когда будет готов

### Key Decisions
- AI SDK v6 использует `DefaultChatTransport({ api })` вместо `api` опции useChat
- AI SDK v6: `toUIMessageStreamResponse()` вместо `toDataStreamResponse()`
- Prisma 7: убраны `url`/`directUrl` из schema.prisma, используется `prisma.config.ts`
- PDF: `@react-pdf/renderer` (не Puppeteer) — работает в Vercel serverless
- GigaChat TLS: `NODE_TLS_REJECT_UNAUTHORIZED=0` только для OAuth-вызова к Sber
- Zod v4 совместимость: tools передаются как `as any` из-за overload mismatch
- Admin auth: cookie-based single password (ADMIN_SESSION_TOKEN в env)
