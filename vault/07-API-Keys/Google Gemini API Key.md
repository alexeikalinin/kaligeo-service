# Google Gemini API Key

tags: #api-keys #setup #google #gemini

**Нужен для:** Gemini 2.0 Flash — опрос AI-платформ (Basic+)  
**Бесплатно:** 1500 запросов/день на Gemini 2.0 Flash (бесплатный tier)  
**Платно:** $0.075 за 1M input токенов

---

## Шаг 1 — Открыть Google AI Studio

Перейти: **https://aistudio.google.com**

```
Войти через Google аккаунт
```

![[screenshots/gemini-01-aistudio.png]]
> *Главная страница aistudio.google.com — нужен Google аккаунт*

---

## Шаг 2 — Получить API Key

```
Левое меню → "Get API key"
→ Нажать синюю кнопку "Create API key"
→ Выбрать "Create API key in new project"
```

![[screenshots/gemini-02-getkey.png]]
> *Кнопка "Get API key" в левом меню AI Studio*

![[screenshots/gemini-03-create.png]]
> *Диалог создания — "Create API key in new project"*

---

## Шаг 3 — Скопировать ключ

```
AIzaSy...XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

Ключ начинается с `AIzaSy`. Нажать иконку копирования рядом с ключом.

![[screenshots/gemini-04-copy.png]]
> *Ключ в формате AIzaSy... — копировать иконкой справа*

---

## Шаг 4 — Добавить в .env.local

```bash
GOOGLE_AI_API_KEY=AIzaSy...
```

---

## Важно

- Бесплатный уровень **не требует** платёжной карты
- Лимит: 1500 запросов/день, 15 запросов/мин
- Для продакшена нужно включить биллинг в Google Cloud Console

---

## Связанные заметки
- [[API Keys Overview]]
