# Domain & Deployment Setup

tags: #setup #domain #vercel #deployment

## Архитектура

```
kaligeo.ru        → лендинг (Vercel проект 1: kaligeo-landing)
app.kaligeo.ru    → веб-приложение (Vercel проект 2: kaligeo-service)
```

---

## Часть 1 — Задеплоить kaligeo-service на Vercel

### Шаг 1 — Залить в GitHub

```bash
cd kaligeo-service
git add .
git commit -m "Initial deploy"
git remote add origin https://github.com/YOUR_USERNAME/kaligeo-service.git
git push -u origin main
```

### Шаг 2 — Создать проект на Vercel

```
vercel.com → "Add New Project"
→ Import Git Repository → выбрать kaligeo-service
→ Framework Preset: Next.js (определится автоматически)
→ "Deploy"
```

### Шаг 3 — Добавить Environment Variables

```
Vercel → проект kaligeo-service → Settings → Environment Variables
→ Добавить все переменные из .env.local
```

Быстрый способ через CLI:
```bash
! vercel env pull  # если уже связан
# или добавить вручную через дашборд
```

---

## Часть 2 — Подключить домен kaligeo.ru

### Где зарегистрирован домен?

Узнать регистратора: **https://www.nic.ru/whois/** → вбить kaligeo.ru

Популярные российские регистраторы: Reg.ru, 2domains, RU-CENTER, Timeweb, Beget

---

### Шаг 1 — Добавить домен в Vercel (лендинг)

```
Vercel → проект kaligeo-LANDING → Settings → Domains
→ "Add Domain"
→ Ввести: kaligeo.ru
→ Также добавить: www.kaligeo.ru
→ Vercel покажет DNS-записи которые нужно добавить
```

Vercel покажет что-то вроде:
```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
```

---

### Шаг 2 — Добавить DNS записи у регистратора

**Reg.ru:**
```
Личный кабинет → Домены → kaligeo.ru → DNS-серверы и управление зоной
→ Управление DNS → Добавить записи
```

**2domains / Beget / Timeweb:**
```
Личный кабинет → Домены → kaligeo.ru → DNS
→ Управление DNS
```

Добавить две записи:
```
A-запись:
  Имя (Name): @  (или пусто)
  Значение (Value): 76.76.21.21
  TTL: 3600

CNAME-запись:
  Имя (Name): www
  Значение (Value): cname.vercel-dns.com
  TTL: 3600
```

⏳ DNS обновляется до 24 часов, обычно 15-30 минут.

Проверить: **https://dnschecker.org** → ввести kaligeo.ru → должен показать 76.76.21.21

---

### Шаг 3 — Добавить субдомен app.kaligeo.ru (для kaligeo-service)

```
У регистратора → DNS → Добавить запись:

CNAME-запись:
  Имя (Name): app
  Значение (Value): cname.vercel-dns.com
  TTL: 3600
```

В Vercel для kaligeo-service:
```
Vercel → проект kaligeo-service → Settings → Domains
→ "Add Domain"
→ Ввести: app.kaligeo.ru
```

---

### Шаг 4 — Обновить NEXT_PUBLIC_APP_URL

В Vercel → kaligeo-service → Environment Variables:
```
NEXT_PUBLIC_APP_URL=https://app.kaligeo.ru
```

---

## Часть 3 — Интеграция лендинга с API

### Вызов Freemium API с лендинга

В проекте лендинга (Next.js):

```typescript
// На лендинге — кнопка "Проверить бесплатно"
const scanWebsite = async (url: string) => {
  const res = await fetch("https://app.kaligeo.ru/api/freemium/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ websiteUrl: url }),
  })
  const { scanId } = await res.json()
  // Перенаправить на страницу результата
  window.location.href = `https://app.kaligeo.ru/preview/${scanId}`
}
```

### CORS — разрешить запросы с kaligeo.ru

В `kaligeo-service/next.config.ts`:

```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/api/freemium/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "https://kaligeo.ru" },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ]
  },
}
```

---

## Часть 4 — SSL сертификат

Vercel выдаёт SSL автоматически (Let's Encrypt) после подключения домена.
Проверить: замочек 🔒 в браузере при открытии kaligeo.ru

---

## Итоговая структура URL

```
kaligeo.ru              → лендинг с freemium
kaligeo.ru/pricing      → страница тарифов
app.kaligeo.ru          → редирект на /chat
app.kaligeo.ru/chat     → чат-агент (для оплативших)
app.kaligeo.ru/preview/[scanId]  → freemium результат
app.kaligeo.ru/report/[id]       → полный отчёт
app.kaligeo.ru/admin    → админ панель
```

---

## Связанные заметки
- [[API Keys Overview]]
- [[Freemium Strategy]]
- [[Vercel Blob Setup]]
