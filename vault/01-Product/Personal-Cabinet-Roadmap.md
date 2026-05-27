# KaliGEO — Личный кабинет: план реализации

> Цель: построить `/my/*` + редизайн отчёта + новые инструменты, чтобы превзойти VisioBrand по UX и глубине.

**Главный UX-принцип vs VisioBrand:** VB показывает цифры. KaliGEO объясняет **почему** и говорит **что делать**.

---

## Статус спринтов

| Спринт | Фаза | Что делаем | Статус |
|--------|------|-----------|--------|
| 1 | Фаза 1: Auth + Portal | Magic link, `/my/dashboard`, portal layout | ✅ Готово |
| 2 | Фаза 2: Domain Check | `/tools/domain-check`, 4 проверки, CTA | ✅ Готово |
| 3 | Фаза 3 (partial) | ScoreRing shared, двухколоночный ScoreHero, WHY-блок в PlatformScoreCard | ✅ Готово |
| 4 | Фаза 4: Portal компоненты | CommandHero, MetricPill, AuditCard, PlatformCoverageGrid, QuickActions | ✅ Готово |
| 5 | Фаза 3 (rest) | Eisenhower matrix в ActionPlan, dark mode toggle, mobile pass | ✅ Готово |
| 6 | Фаза 6: Sources | `/my/sources` — Citation Heatmap, Gaps, SourcesAnalysis | ✅ Готово |
| 7 | Фаза 5: Brand Profile | BrandProfile в Prisma, `/my/brands/[id]`, TagInput, кастомные промпты | ✅ Готово |
| 8 | Фаза 7: Pricing | `lib/gates.ts` displayName, `/app/pricing/page.tsx` редизайн | ✅ Готово |
| 9 | Фаза 3 (last) | Bubble chart конкурентов, Kanban drag-and-drop в ActionPlan, sparklines | ✅ Готово |

---

## Фаза 1 — Авторизация клиента + Портал ✅

### Что сделано
- `MagicLinkToken` модель в Prisma
- `lib/client-session.ts` — HMAC cookie (clientId:ts:sig)
- `POST /api/client/auth/magic-link` — rate limit 3/5мин, создаёт токен TTL 15 мин
- `GET /api/client/auth/verify?token=XXX` — валидация, cookie, redirect
- `POST /api/client/auth/logout` — очищает cookie
- `app/my/login/page.tsx` — split-screen (форма + animated preview)
- `app/my/(portal)/layout.tsx` — guard (getClientSession → redirect /my/login)
- `app/my/(portal)/dashboard/page.tsx` — CommandHero + MetricPills + AuditCards
- `app/my/(portal)/audits/[id]/page.tsx` — redirect на `/report/[id]?token=...`
- `lib/notify.ts` — `sendMagicLinkEmail()`
- `trigger/steps/deliver.ts` — ссылка «Личный кабинет» в email

### Компоненты portal/
- `PortalTopNav.tsx` — sticky nav, active links, logout, dark mode toggle
- `MagicLinkForm.tsx` — форма, 429 handling
- `LoginPreview.tsx` — анимированный preview (ScoreRing 67/100 + платформы)
- `CommandHero.tsx` — акцентная карточка (lime если ≥60, bone-2 иначе)
- `MetricPill.tsx` — KPI: число + label + subtitle + accent mode
- `AuditCard.tsx` — строка: score + delta + tier + date + АКТУАЛЬНЫЙ badge
- `PlatformCoverageGrid.tsx` — 9 платформ, ✓/— + opacity для uncovered
- `QuickActions.tsx` — "Проверить домен", "Сравнить аудиты"

---

## Фаза 2 — Domain Check ✅

### Что сделано
- `POST /api/tools/domain-check` — 4 проверки параллельно (5s timeout):
  1. robots.txt — GPTBot/ClaudeBot/anthropic-ai разрешены
  2. llms.txt — файл существует + не пуст
  3. Schema.org — Organization/Product разметка
  4. SSR — `<title>` и `<h1>` в raw HTML
- Score = passed × 25
- `app/tools/domain-check/page.tsx` — публичная страница
- `components/portal/DomainCheckWidget.tsx` — URL input + ScoreRing + checks + CTA

---

## Фаза 3 — Редизайн отчёта ✅ (частично)

### Что сделано
- `components/report/ScoreRing.tsx` — shared SVG ring с RAF-анимацией
- `components/report/ScoreHero.tsx` — двухколоночный grid + narrative из weakPoints
- `components/report/PlatformScoreCard.tsx` — expandable WHY-блок, 0-score = dark card
- `components/report/PlatformScoresGrid.tsx` — передаёт weakPoints в каждую карточку
- `components/report/ReportDashboard.tsx` — ScoreHero с onGrowthPlanClick
- `app/globals.css` — новые токены: `--ink-card`, `--accent-dim`, `--success`, `--warn`, `--danger`, `[data-theme="dark"]`

### Что осталось (Sprint 9)
- [ ] Bubble chart конкурентов (Recharts) в CompetitorMatrixTable
- [ ] Kanban drag-and-drop в ActionPlanTimeline
- [ ] Спарклайны на PlatformScoreCard (SVG polyline 40×16)

---

## Фаза 4 — Dashboard компоненты ✅

Все компоненты `components/portal/` — см. Фаза 1.

---

## Фаза 5 (Sprint 5) — Rest of Phase 3 ✅

### Что сделано
- `ActionPlanTimeline.tsx` — toggle «Список | Матрица» + Eisenhower 2×2
- `PortalTopNav.tsx` — dark mode toggle (☾/☀, localStorage + dataset.theme)
- `ScoreHero.tsx` — добавлен `score-hero-grid` class для mobile media query

---

## Фаза 6 — Sources Intelligence ✅

### Что сделано
- `app/my/(portal)/sources/page.tsx` — Sources page с SourcesAnalysis + Citation Heatmap + Gaps
- Ссылка «Источники» в PortalTopNav

---

## Фаза 5 — Brand Profile ✅

### Что сделано
- `BrandProfile` модель в Prisma (clientId, companyName, websiteUrl, niche, alternativeNames[], customPrompts Json, competitors[])
- `GET/POST /api/client/brands` — список / создание
- `PATCH/DELETE /api/client/brands/[id]` — обновление / удаление
- `app/my/(portal)/brands/page.tsx` — список профилей
- `app/my/(portal)/brands/[brandId]/page.tsx` — edit/new
- `components/portal/BrandProfileEditor.tsx` — TagInput + PromptEditor + сохранение

---

## Фаза 7 — Пересмотр тарифов ⬜ (следующий)

### Что нужно сделать
- `lib/gates.ts` — добавить `displayName` и `positioning` к TierConfig
- `app/pricing/page.tsx` — редизайн: два блока (Разовый / Подписка)
- Акцент: «Платите один раз. Отчёт ваш навсегда.» vs VB 29 990 ₽/мес

### Тарифная сетка
| Tier | displayName | Цена | Позиционирование |
|------|-------------|------|-----------------|
| BASIC | Старт | 4 900 ₽ | Разовый аудит |
| STANDARD | Профи | 9 900 ₽ | Разовый аудит |
| ADVANCED | Агентский | 27 900 ₽ | Разовый аудит |
| MONITOR_START | Мониторинг Старт | — | Подписка |
| MONITOR_PRO | Мониторинг Профи | — | Подписка |
| MONITOR_AGENT | Мониторинг Агент | — | Подписка |

---

## Фаза 3 (last, Sprint 9) ⬜

- [ ] Bubble chart конкурентов: ScatterChart в CompetitorMatrixTable (X = платформ, Y = упоминаний)
- [ ] Kanban в ActionPlanTimeline: нативный HTML5 drag-and-drop, 3 колонки 30d/60d/90d
- [ ] Спарклайны на PlatformScoreCard: SVG polyline 40×16, данные из истории аудитов

---

## Дизайн-система

```css
--ink:    #0F1115   /* основной текст */
--ink-2:  #3A3D45
--ink-3:  #6A6D75
--bone:   #FAFAF7
--bone-2: #F2F1EB
--rule:   #E5E5E1
--accent: #C8F24A   /* lime */
--accent-ink: #0F1115
--ink-card: #1A1D24  /* тёмные карточки (WHY-блок) */
--success: #22c55e
--warn: #f59e0b
--danger: #ef4444
```

Шрифты: `Instrument Serif` (заголовки) · `Inter Tight` (тело) · `JetBrains Mono` (данные, теги)

---

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `prisma/schema.prisma` | MagicLinkToken, BrandProfile, Client с relations |
| `lib/client-session.ts` | HMAC cookie sign/verify |
| `lib/notify.ts` | sendMagicLinkEmail() |
| `lib/gates.ts` | TierConfig — фичи по тарифам |
| `app/my/(portal)/layout.tsx` | Auth guard + PortalTopNav |
| `components/report/ScoreRing.tsx` | Shared animated SVG ring |
| `components/report/ScoreHero.tsx` | Двухколоночный герой отчёта |
| `components/report/PlatformScoreCard.tsx` | Expandable WHY-блок |
| `components/report/ActionPlanTimeline.tsx` | Список + Eisenhower matrix |
| `components/portal/BrandProfileEditor.tsx` | TagInput + PromptEditor |
