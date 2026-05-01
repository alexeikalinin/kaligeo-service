# Supabase Setup (PostgreSQL)

tags: #api-keys #setup #database #supabase

**Используем вместо Neon** — проект уже существует (KaliGEO)  
**Project ID:** `sfjqjghiqrniasmrberw`  
**Бесплатно:** 500 MB, 2 проекта

---

## Шаг 1 — Создать проект

Перейти: **https://supabase.com** → "New project"

```
Project name: KaliGEO
Database password: (сохранить!)
Region: Europe (Frankfurt)
Security:
  ✅ Enable Data API
  ☐ Automatically expose new tables  ← снять галочку
  ☐ Enable automatic RLS             ← оставить выключенным
→ "Create new project"
```

![[screenshots/supabase-01-create.png]]
> *Форма создания — Region: Europe, снять галочку "Automatically expose new tables"*

⚠️ **Скопировать пароль сразу** — после создания не будет показан повторно.

---

## Шаг 2 — Получить строки подключения

В новом интерфейсе Supabase строка подключения находится **НЕ в Settings**.

```
Нажать зелёную кнопку "Connect" вверху страницы
→ В открывшемся окне "Connect to your project"
→ Нажать вкладку "ORM" (третья иконка, "Third-party library")
→ В дропдауне выбрать "Prisma"
→ Скопировать две строки: DATABASE_URL и DIRECT_URL
```

![[screenshots/supabase-02-connect-button.png]]
> *Кнопка "Connect" — зелёная, вверху рядом с названием проекта*

![[screenshots/supabase-03-connect-tabs.png]]
> *Четыре вкладки: Framework / Direct / ORM / MCP — нажать "ORM"*

![[screenshots/supabase-04-orm-prisma.png]]
> *ORM → выбрать Prisma → появятся DATABASE_URL и DIRECT_URL*

Строки будут выглядеть так (заменить `[YOUR-PASSWORD]` на реальный пароль):
```
DATABASE_URL=postgresql://postgres.sfjqjghiqrniasmrberw:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres

DIRECT_URL=postgresql://postgres.sfjqjghiqrniasmrberw:[YOUR-PASSWORD]@aws-0-eu-central-1.supabase.com:5432/postgres
```

⚠️ Если пароль содержит спецсимволы (`@`, `/`, `*`) — их нужно URL-encode:
```
@  →  %40
/  →  %2F
*  →  %2A
```

Например пароль `CrRUs8s7@Bw*9y/` становится `CrRUs8s7%40Bw%2A9y%2F`

---

## Шаг 3 — Добавить в .env.local

```bash
DATABASE_URL="postgresql://postgres.sfjqjghiqrniasmrberw:CrRUs8s7%40Bw%2A9y%2F@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
DIRECT_URL="postgresql://postgres.sfjqjghiqrniasmrberw:CrRUs8s7%40Bw%2A9y%2F@aws-0-eu-central-1.supabase.com:5432/postgres"
```

---

## Шаг 4 — Создать таблицы

```bash
npx prisma db push
```

Ожидаемый вывод:
```
✔ Generated Prisma Client
✔ Your database is now in sync with your Prisma schema.
```

---

## Связанные заметки
- [[API Keys Overview]]
- [[Trigger.dev Setup]]
