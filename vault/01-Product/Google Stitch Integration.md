# Google Stitch Integration

tags: #product #stitch #google #idea

## Что такое Google Stitch

- **URL:** https://stitch.withgoogle.com
- **Что делает:** Генерирует UI/фронтенд код из текстового описания
- **Технология:** Gemini 2.5 Pro/Flash
- **Экспорт:** HTML/CSS, Tailwind, Vue, Angular, Flutter, SwiftUI
- **MCP сервер:** Работает с Claude Code, Cursor, Gemini CLI
- **Цена:** Бесплатно — 350 стандартных + 50 Pro генераций/мес

## Как подключить MCP

В `~/.claude/settings.json` добавить:
```json
"stitch": {
  "command": "npx",
  "args": ["-y", "@google/stitch-mcp"]
}
```
*(название пакета уточнить на stitch.withgoogle.com/docs)*

## Варианты интеграции с KaliGEO

### Вариант A — Улучшение отчёта (быстро)
Использовать Stitch для генерации красивых UI-компонентов отчёта.
После аудита: данные → Stitch → современные React компоненты → заменить текущие базовые компоненты.

### Вариант B — "AI Website Fix" сервис (основной)
Дополнительный платный сервис к аудиту:

```
Аудит завершён → Score низкий → 
"Хотите исправить сайт? Запустите AI Website Fix за $150"
  ↓
Данные аудита (слабые места, конкуренты, ниша) → 
Stitch генерирует:
  - Новый главный экран с улучшенным entity signaling
  - Переработанные страницы услуг с FAQ (для AI-цитирования)
  - Schema разметку
  ↓
Клиент получает:
  - 3 варианта дизайна
  - Готовый Tailwind/HTML код
  - Инструкции по внедрению
```

**Монетизация:**
| Пакет | Цена | Что входит |
|---|---|---|
| Website Fix Basic | $150 | 1 страница переработана |
| Website Fix Pro | $300 | 3 страницы + Schema разметка |
| Website Fix + Audit | $400 | Аудит Advanced + Fix Pro |

### Вариант C — Отдельный продукт
Самостоятельный сервис AI Landing Page Generator на базе Stitch. Использует KaliGEO как source of truth о том как сайт должен выглядеть для AI-видимости.

## Технический план реализации (Вариант B)

1. Подключить Stitch MCP в Claude Code
2. Создать `lib/agents/website-fix-agent.ts`:
   - Принимает: auditJobId
   - Читает: weakPoints, competitorMatrix из Report
   - Формирует промпт для Stitch: "Создай landing page для [ниша] с акцентом на [слабые места]"
   - Возвращает: сгенерированный код
3. Добавить в `/report/[id]` кнопку "Улучшить сайт"
4. Новый роут `/report/[id]/website-fix`

## Статус

- [ ] Изучить API/MCP документацию Stitch
- [ ] Подключить Stitch MCP к Claude Code
- [ ] Прототип: сгенерировать страницу по данным тестового аудита
- [ ] Решить по монетизации

## Связанные заметки
- [[Monetization Model]]
- [[Feature Backlog]]
- [[Agent System]]
