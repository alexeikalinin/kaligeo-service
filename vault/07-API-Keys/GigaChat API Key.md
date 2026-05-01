# GigaChat API Key

tags: #api-keys #setup #gigachat #sber

**Нужен для:** GigaChat — опрос российского AI (Advanced тариф)  
**Особенность:** Нужен Сбер ID (телефон РФ) + есть бесплатный лимит  
**Сложность:** ⚠️ Самый сложный в настройке из-за OAuth и TLS

---

## Предварительные требования

- Телефонный номер РФ (для Сбер ID)
- Если нет Сбер ID — нужно создать на **sber.ru**

---

## Шаг 1 — Перейти на портал разработчиков

Перейти: **https://developers.sber.ru/portal/products/gigachat**

```
Нажать "Подключить" (синяя кнопка)
```

![[screenshots/gigachat-01-portal.png]]
> *Главная страница GigaChat API — кнопка "Подключить"*

---

## Шаг 2 — Войти через Сбер ID

```
Откроется форма входа Сбер ID
→ Ввести номер телефона РФ
→ Подтвердить через СМС или приложение СберБанк
```

![[screenshots/gigachat-02-sberid.png]]
> *Форма входа Сбер ID — поле для номера телефона*

---

## Шаг 3 — Создать проект

После входа попадаешь в личный кабинет разработчика:

```
"Мои проекты" → "+ Новый проект"
→ Название: "KaliGEO"
→ Нажать "Создать"
```

![[screenshots/gigachat-03-project.png]]
> *Раздел "Мои проекты" → кнопка создания нового*

---

## Шаг 4 — Выбрать API GigaChat

```
Открыть созданный проект
→ "+ Добавить API"  или вкладка "API"
→ Выбрать "GigaChat API"
→ Тариф: "Физ. лицо (GIGACHAT_API_PERS)"  ← у него есть бесплатный лимит
→ Нажать "Подключить"
```

![[screenshots/gigachat-04-api.png]]
> *Выбор тарифа — "Физ. лицо (GIGACHAT_API_PERS)"*

---

## Шаг 5 — Получить Client ID и Client Secret

```
Открыть подключённый проект
→ Раздел "Авторизационные данные" или "Credentials"
→ Скопировать "Client ID"
→ Нажать "Сгенерировать секрет" → скопировать "Client Secret"
```

⚠️ Client Secret показывается один раз при генерации.

![[screenshots/gigachat-05-credentials.png]]
> *Авторизационные данные — Client ID и кнопка генерации секрета*

```
Client ID:     xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
Client Secret: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Шаг 6 — Добавить в .env.local

```bash
GIGACHAT_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GIGACHAT_CLIENT_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Шаг 7 — Проверить соединение

Тест OAuth (получить токен):
```bash
curl -k -X POST \
  "https://ngw.devices.sberbank.ru:9443/api/v2/oauth" \
  -H "Authorization: Basic $(echo -n '$GIGACHAT_CLIENT_ID:$GIGACHAT_CLIENT_SECRET' | base64)" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "RqUID: $(uuidgen)" \
  -d "scope=GIGACHAT_API_PERS"
```

Флаг `-k` отключает проверку TLS (нужен из-за российского CA Сбера).

Ожидаемый ответ:
```json
{"access_token": "eyJ...", "expires_at": 1234567890}
```

---

## Известная проблема с TLS

Sber использует сертификат от российского удостоверяющего центра (Минцифры), который не входит в стандартный доверенный список Node.js.

**В коде уже реализован обход** в `lib/ai-clients/gigachat.ts`:
```typescript
// Временно отключаем проверку TLS только для OAuth запроса
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
// ... OAuth вызов ...
// Немедленно восстанавливаем после вызова
process.env.NODE_TLS_REJECT_UNAUTHORIZED = prev
```

Это безопасно т.к. отключение работает только для одного HTTP запроса к известному endpoint.

---

## Бесплатный лимит

| Операция | Бесплатно |
|---|---|
| Запросы к GigaChat | 100 запросов/день |
| Токены | До 1000 токенов/запрос |

Для тестирования достаточно. Для продакшена — тариф "Бизнес".

---

## Связанные заметки
- [[API Keys Overview]]
- [[YandexGPT API Key]]
