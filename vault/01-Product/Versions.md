# KaliGEO — Версии и контрольные точки

> Файл для быстрого отката. При каждом крупном деплое добавлять строку.

---

## v0.9.0-pre-portal — 2026-05-28

**Git tag:** `v0.9.0-pre-portal`  
**Commit:** `a131b2e`  
**Статус:** Локально готов, **не задеплоен** на Vercel (push ещё не выполнен)

### Что включено

**Личный кабинет (`/my/*`)**
- Magic link авторизация (HMAC cookie, 15 мин TTL)
- `/my/login` — split-screen форма
- `/my/dashboard` — CommandHero + MetricPills + список аудитов
- `/my/sources` — Sources Intelligence (Citation Heatmap + Gaps)
- `/my/brands` — список бренд-профилей
- `/my/brands/[id]` — редактор профиля (конкуренты, ниша, кастомные промпты)

**Редизайн отчёта**
- ScoreRing вынесен в `components/report/ScoreRing.tsx`
- Двухколоночный ScoreHero (скор + нарратив)
- Expandable PlatformScoreCard с WHY-блоком и инверсией для 0-score
- Спарклайны (SVG polyline 40×16) на карточках платформ
- ActionPlanTimeline: три вида (Список / Доска Kanban / Матрица Эйзенхауэра)
- CompetitorMatrixTable: переключение Таблица / Пузырёк (Recharts ScatterChart)
- Dark mode (`[data-theme="dark"]` + localStorage)

**Новые страницы**
- `/tools/domain-check` — бесплатная проверка AI-готовности сайта (4 checks)
- `/pricing` — страница тарифов (разовый + подписка, сравнение с VisioBrand)

**Пайплайн**
- BrandProfile интегрирован в pipeline (кастомные промпты в generateQueries)
- audit/submit читает BrandProfile по домену клиента
- Email содержит ссылку на `/my/dashboard`

**Лендинги** (файлы готовы, нужно залить на hoster.by вручную)
- Добавлена кнопка "Личный кабинет" в навбар и мобильное меню
- Добавлена кнопка "Проверить домен бесплатно →" в hero CTA row

**Prisma schema**
- `BrandProfile` модель добавлена
- `AuditJob.brandProfileId` добавлен
- `npx prisma db push` выполнен ✅

### Как откатиться

```bash
# Вернуть код к тегу (не трогая БД)
git checkout v0.9.0-pre-portal

# Или создать ветку от тега
git checkout -b rollback/pre-portal v0.9.0-pre-portal
```

> ⚠️ **БД откатить нельзя автоматически.** При откате кода с v0.9.0 нужно вручную удалить таблицу `BrandProfile` и колонку `AuditJob.brandProfileId` через Prisma Studio или SQL.

### Потенциальные риски при деплое

| Риск | Статус |
|------|--------|
| Личный кабинет — сервер вне РФ/РБ (Vercel US) | ⚠️ Может поднять вопросы регуляторов — мониторить |
| `CLIENT_SESSION_SECRET` в Vercel env | ✅ Добавлен через `vercel env add` |
| Prisma schema синхронизирована с prod БД | ✅ `db push` выполнен |
| `MagicLinkToken` в schema — уже была | ✅ Присутствует с предыдущих версий |

---

## v0.8.x — до 2026-05-28

Версии до добавления личного кабинета. Базовая функциональность:
- Аудит через `/admin`
- Отчёт по токен-ссылке `/report/[id]?token=...`
- Freemium скан через API
- Alfa-Bank оплата
- Trigger.dev пайплайн

**Git:** commit `249ed28` и ранее.

---

## Откат в экстренной ситуации

```bash
# 1. Быстрый откат на Vercel (без кода) — через панель Vercel:
#    Settings → Deployments → выбрать предыдущий деплой → Promote to Production

# 2. Откат кода:
git checkout 249ed28   # последний стабильный коммит до personal cabinet

# 3. Деплой предыдущей версии:
git push origin HEAD:main --force   # только если необходимо, с согласования
```
