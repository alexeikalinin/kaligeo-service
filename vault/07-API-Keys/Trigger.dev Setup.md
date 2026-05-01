# Trigger.dev Setup

tags: #api-keys #setup #triggerdev

**Нужен для:** Фоновый пайплайн аудита (все 6 шагов)  
**Бесплатно:** 5000 runs/мес  
**Без него:** Аудит не запустится после submit

---

## Шаг 1 — Создать аккаунт

Перейти: **https://trigger.dev**

```
"Get started for free" → войти через GitHub
```

---

## Шаг 2 — Создать организацию

```
Organization name: KaliGEO
URL: (оставить пустым — необязательно)
Number of employees: 1-5
→ "Create"
```

---

## Шаг 3 — Создать проект

```
Project name: kaligeo-service
What are you working on? → пропустить (не выбирать)
What technologies are you using? → Next.js (выбрано по умолчанию)
What are you trying to do? → пропустить (не выбирать)
→ "Create"
```

---

## Шаг 4 — Экран "Get setup in 3 minutes"

![[screenshots/trigger-04-setup-screen.png]]
> *После создания проекта появится этот экран с тремя шагами.*
> *Шаг 1 (init) — ПРОПУСТИТЬ. У нас уже есть папка trigger/ с готовым кодом.*

Trigger.dev предложит три шага — нам нужен **только Secret Key**:

```
Левое меню → "API Keys" (внизу левой панели, раздел Manage)
```

---

## Шаг 5 — Получить Secret Key

```
Левое меню → "API Keys"
→ Найти строку "Development Secret Key"  
→ Нажать иконку копирования
```

![[screenshots/trigger-05-apikeys.png]]

```
tr_dev_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Шаг 6 — Добавить в .env.local

```bash
TRIGGER_SECRET_KEY=tr_dev_...
```

---

## Шаг 7 — Запустить воркер локально

В **отдельном терминале** в папке проекта:

```bash
npx trigger.dev@latest dev
```

Ожидаемый вывод:
```
✔ Connected to Trigger.dev (kaligeo-service)
✔ Watching for changes...
   audit-pipeline  ← должна появиться эта задача
```

![[screenshots/trigger-07-dev-running.png]]

> ⚠️ Воркер должен работать пока тестируешь локально.
> При деплое на Vercel воркер не нужен — Trigger.dev запускает задачи сам.

---

## Шаг 8 — Проверить регистрацию задачи

В дашборде Trigger.dev:
```
Левое меню → "Tasks"
→ Должна появиться задача "audit-pipeline"
```

Если задача не появилась — убедись что воркер запущен и `.env.local` заполнен.

---

## Для продакшена (Vercel)

При деплое нужен production ключ:
```
API Keys → Production Secret Key → tr_live_...
```
Добавить в Vercel Environment Variables как `TRIGGER_SECRET_KEY`.

---

## Связанные заметки
- [[API Keys Overview]]
- [[Neon Database Setup]]
