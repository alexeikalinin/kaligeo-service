# Resend API Key

tags: #api-keys #setup #resend #email

**Нужен для:** Отправка email с отчётом клиенту после завершения аудита  
**Бесплатно:** 3000 писем/мес, 100 писем/день  
**Важно:** Нужен собственный домен для отправки (или использовать onboarding@resend.dev для теста)

---

## Шаг 1 — Создать аккаунт

Перейти: **https://resend.com**

```
"Get started for free" → email или GitHub
```

![[screenshots/resend-01-signup.png]]

---

## Шаг 2 — Получить API Key

```
Левое меню → "API Keys"
→ "+ Add API Key"
→ Имя: "kaligeo"
→ Permission: "Full access"
→ "Add"
```

![[screenshots/resend-02-apikey.png]]
> *Раздел API Keys → Add API Key*

Скопировать ключ:
```
re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Шаг 3 — Добавить домен (для продакшена)

Для отправки с `noreply@kaligeo.com`:

```
Левое меню → "Domains"
→ "Add Domain"
→ Ввести: kaligeo.com
→ Добавить DNS записи которые покажет Resend
→ Дождаться верификации (5-10 мин)
```

![[screenshots/resend-03-domain.png]]
> *Добавление домена — нужно добавить TXT и MX записи в DNS*

**Для тестирования** домен не нужен — используй:
```bash
FROM_EMAIL=onboarding@resend.dev
```
Но письма будут только на твой email (тот с которого зарегистрировался).

---

## Шаг 4 — Добавить в .env.local

```bash
RESEND_API_KEY=re_...
FROM_EMAIL=onboarding@resend.dev   # для теста
# FROM_EMAIL=noreply@kaligeo.com   # для продакшена (после добавления домена)
```

---

## Связанные заметки
- [[API Keys Overview]]
