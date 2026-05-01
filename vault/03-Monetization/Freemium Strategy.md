# Freemium Strategy

tags: #monetization #freemium #conversion #product

## Решение: Freemium на лендинге

Freemium = самый сильный инструмент конверсии для аудит-продуктов.
Клиент не платит за невидимую боль. Freemium делает боль видимой.

## Воронка

```
Лендинг (URL input, без регистрации)
    ↓
Email capture ("Результаты готовы — введите email")
    ↓
Score Preview:
  - AI Score (число/100)
  - 1 платформа (ChatGPT) — данные видны
  - Конкуренты — заблюрены
  - Слабые места — заблюрены (счётчик "5 проблем найдено")
    ↓
CTA: "Разблокировать полный отчёт"
  - Basic $50 / Standard $150 / Advanced $300+
    ↓
Email follow-up (если не купили сразу)
  - Тема: "Ваш сайт набрал X/100"
  - Конкретные данные что теряет
  - Ссылка на checkout
```

## Стоимость freemium

5 запросов × GPT-4o Mini (дешевле gpt-4o) = ~$0.001
При 1000 пользователей/мес = $1-5. Окупается одной продажей.

**Оптимизация:** использовать GPT-4o-mini вместо gpt-4o для freemium-запросов.

## Score Preview — что показываем/скрываем

### Видно бесплатно:
- Общий AI Score (число)
- ChatGPT: citation rate, количество упоминаний
- Топ-1 конкурент (имя, но не данные)
- Количество найденных проблем (без деталей)

### Заблюрено / скрыто:
- Конкуренты #2-10 (имена и данные)
- Детали слабых мест
- Другие 5-7 платформ
- Action plan
- PDF

## Email capture — зачем критически важен

1. Получаем лид даже без покупки
2. Follow-up серия писем (3-5 писем за 7 дней)
3. Напоминание через неделю: "Ваш score всё ещё 23/100"
4. Данные для анализа: какие ниши конвертируют лучше

## Новые таблицы БД

```prisma
model FreemiumScan {
  id          String   @id @default(cuid())
  websiteUrl  String
  email       String?
  score       Int?
  platform    String   @default("CHATGPT")
  resultData  Json?
  converted   Boolean  @default(false)  // купил ли потом
  createdAt   DateTime @default(now())
}
```

## Новые роуты

```
POST /api/freemium/scan    ← запустить бесплатный скан
POST /api/freemium/email   ← захватить email, отдать результат
GET  /preview/[scanId]     ← страница с score preview + blur
POST /api/freemium/convert ← конверсия в платный аудит
```

## Страница preview (/preview/[scanId])

Ключевые элементы:
1. Большой Score с цветом (красный если < 30)
2. "ChatGPT упоминает вас в X% ответов"  
3. "Ваш конкурент [Имя] — в Y%" (один, остальные скрыты)
4. Список проблем с замочком 🔒
5. Три кнопки тарифа с чётким описанием
6. Обратный отсчёт "Результаты хранятся 48 часов" (urgency)

## Urgency и social proof

- "🔥 Сегодня запущено 12 аудитов"
- "⏱ Результаты хранятся 48 часов"
- "В вашей нише уже 3 конкурента прошли аудит"

## Связанные заметки
- [[Monetization Model]]
- [[Product Vision]]
- [[User Journey]]
