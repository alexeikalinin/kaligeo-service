# Google Stitch MCP Setup

tags: #setup #stitch #mcp #google

## Что даёт Stitch MCP

Claude Code подключается к Stitch и может:
- `get_screen_code` — получить HTML/CSS код экрана из Stitch
- `get_screen_image` — получить скриншот экрана как base64
- Генерировать UI-компоненты прямо в чате с Claude

Это значит: описываешь интерфейс словами → Stitch генерирует → Claude встраивает в проект.

---

## Шаг 1 — Создать дизайн в Stitch

Перейти: **https://stitch.withgoogle.com**

```
Войти через Google аккаунт
→ "New project"
→ Описать что нужно: например
  "KaliGEO audit report dashboard, dark minimal style,
   AI score 73/100, platform scores grid, competitor table"
→ Stitch сгенерирует UI
```

Для каждого экрана Stitch создаёт **URL вида:**
```
https://stitch.withgoogle.com/edit/PROJECT_ID
```

---

## Шаг 2 — Установить Stitch MCP в Claude Code

Обновить `~/.claude/settings.json` — добавить в `mcpServers`:

```json
"stitch": {
  "command": "npx",
  "args": ["-y", "@_davideast/stitch-mcp@latest"]
}
```

После сохранения — **перезапустить Claude Code** (закрыть и открыть заново).

---

## Шаг 3 — Проверить что MCP подключился

В новой сессии Claude Code написать:
```
/mcp
```
В списке должен появиться `stitch` с инструментами `get_screen_code` и `get_screen_image`.

---

## Как использовать в KaliGEO

### Сгенерировать компонент отчёта

```
Открой Stitch, создай экран "KaliGEO Report — Score Hero"
→ Получи screen ID из URL
→ В Claude Code: "Используй Stitch get_screen_code для экрана [ID],
  адаптируй под React/Tailwind и замени components/report/ScoreHero.tsx"
```

### Сгенерировать PDF слайд

```
В Stitch: создай слайд в стиле брендбука (тёмный, цифра 73, lime акцент)
→ Claude Code: "get_screen_image [ID] → использовать как референс
  для обновления ReportPDFDocument.tsx"
```

### Website Fix для Advanced клиентов

```
Данные аудита (слабые места, конкуренты, ниша) →
Claude формирует промпт для Stitch →
"Landing page for [медцентр] emphasizing [кардиология, гинекология],
 addressing weak points: no FAQ, missing Schema markup"
→ Клиент получает готовый HTML/Tailwind код
```

---

## Stitch в тарифах KaliGEO

| Тариф | Доступ к Stitch |
|---|---|
| Basic $50 | ❌ |
| Standard $150 | ❌ |
| Advanced $300+ | ✅ AI Website Fix (1 страница) |
| Website Fix Pack $150 | ✅ 3 страницы + Schema |

---

## Связанные заметки
- [[Google Stitch Integration]]
- [[Monetization Model]]
- [[Domain & Deployment Setup]]
