# DeepSeek API Key

tags: #api-keys #setup #deepseek

**Нужен для:** DeepSeek Chat — опрос AI (Standard+)  
**Особенность:** Самый дешёвый сильный AI — $0.14 за 1M input токенов  
**Бесплатно:** $5 кредитов при регистрации

---

## Шаг 1 — Создать аккаунт

Перейти: **https://platform.deepseek.com**

```
"Sign Up" → email + пароль → подтвердить email
```

![[screenshots/deepseek-01-signup.png]]
> *Главная platform.deepseek.com — кнопка Sign Up*

---

## Шаг 2 — Перейти в API Keys

```
Левое меню → "API keys"
```

Прямая ссылка: **https://platform.deepseek.com/api_keys**

![[screenshots/deepseek-02-apikeys.png]]
> *Раздел API keys в левом меню платформы*

---

## Шаг 3 — Создать ключ

```
Нажать "+ Create new API key"
→ Name: "kaligeo"
→ Нажать "Create"
```

![[screenshots/deepseek-03-create.png]]
> *Кнопка создания ключа и поле имени*

---

## Шаг 4 — Скопировать ключ

⚠️ Показывается один раз.

```
sk-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

![[screenshots/deepseek-04-copy.png]]
> *Ключ начинается с sk- — скопировать сразу*

---

## Шаг 5 — Добавить в .env.local

```bash
DEEPSEEK_API_KEY=sk-...
```

---

## Связанные заметки
- [[API Keys Overview]]
