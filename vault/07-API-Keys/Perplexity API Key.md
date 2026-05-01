# Perplexity API Key

tags: #api-keys #setup #perplexity

**Нужен для:** Perplexity Sonar — опрос AI с веб-поиском (Standard+)  
**Особенность:** Perplexity ищет в интернете в реальном времени — его ответы самые актуальные  
**Стоимость:** $5 за 1000 запросов (sonar), $200/мес subscription для API

---

## Шаг 1 — Создать аккаунт

Перейти: **https://www.perplexity.ai**

```
Кнопка "Sign Up" → войти через Google или email
```

---

## Шаг 2 — Перейти в настройки API

```
Правый верхний угол → иконка аккаунта → "Settings"
→ Левое меню → "API"
```

Прямая ссылка: **https://www.perplexity.ai/settings/api**

![[screenshots/perplexity-01-settings.png]]
> *Меню Settings → раздел API в левой панели*

---

## Шаг 3 — Сгенерировать ключ

```
Нажать "+ Generate" (или "New API Key")
→ Имя: "kaligeo" (опционально)
→ Ключ появится в таблице
```

![[screenshots/perplexity-02-generate.png]]
> *Кнопка Generate в разделе API Keys*

---

## Шаг 4 — Скопировать ключ

```
pplx-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Ключ начинается с `pplx-`.

---

## Шаг 5 — Добавить в .env.local

```bash
PERPLEXITY_API_KEY=pplx-...
```

---

## Важно — модель

В нашем коде используется `sonar-pro`. Если нет Pro подписки или план не включает её — заменить на `sonar`:

```typescript
// lib/ai-clients/perplexity.ts — строка с model:
model: "sonar"  // вместо "sonar-pro"
```

**Модели:**
- `sonar` — базовая, дешевле
- `sonar-pro` — улучшенная, нужна Pro подписка API

---

## Связанные заметки
- [[API Keys Overview]]
