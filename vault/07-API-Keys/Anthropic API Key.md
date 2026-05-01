# Anthropic API Key (Claude)

tags: #api-keys #setup #anthropic

**Нужен для:** Claude Sonnet — чат-агент, генерация action plan, post-audit chat, агенты анализа  
**Тариф:** Standard+  
**Стоимость:** Pay-per-use, ~$3 за 1M input токенов (Sonnet)  
**Бесплатно:** $5 кредитов при регистрации

---

## Шаг 1 — Создать аккаунт

Перейти: **https://console.anthropic.com**

```
Нажать "Sign up" → ввести email → подтвердить почту → войти
```

![[screenshots/anthropic-01-signup.png]]
> *Главная страница console.anthropic.com — кнопка Sign up в правом верхнем углу*

---

## Шаг 2 — Перейти в API Keys

После входа в Anthropic Console:

```
Левое меню → "API Keys"   (или прямая ссылка: console.anthropic.com/settings/keys)
```

![[screenshots/anthropic-02-menu.png]]
> *Левое меню Console: Settings → API Keys*

---

## Шаг 3 — Создать ключ

```
Нажать "+ Create Key"
→ Имя: "kaligeo-production" (или любое)
→ Нажать "Create Key"
```

![[screenshots/anthropic-03-create.png]]
> *Диалог создания ключа — поле Name и кнопка Create Key*

---

## Шаг 4 — Скопировать ключ

⚠️ **Ключ показывается ОДИН РАЗ.** Скопировать сразу.

```
sk-ant-api03-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

![[screenshots/anthropic-04-copy.png]]
> *Ключ начинается с sk-ant-api03-... — нажать иконку копирования*

---

## Шаг 5 — Добавить в .env.local

```bash
ANTHROPIC_API_KEY=sk-ant-api03-...
```

---

## Лимиты и тарифы

| Модель | Input | Output |
|---|---|---|
| claude-sonnet-4-6 | $3/1M токенов | $15/1M токенов |
| claude-haiku-4-5 | $0.25/1M токенов | $1.25/1M токенов |

Для тестирования достаточно $5 кредитов (≈1000 аудит-запросов).

---

## Связанные заметки
- [[API Keys Overview]]
- [[YandexGPT API Key]]
