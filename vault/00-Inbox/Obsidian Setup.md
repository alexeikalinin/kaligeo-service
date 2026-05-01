# Obsidian Setup

tags: #setup #obsidian #mcp

## Как открыть vault

1. Скачать Obsidian: https://obsidian.md
2. Открыть Obsidian → "Open folder as vault"
3. Выбрать папку: `kaligeo-service/vault`
4. Готово — все заметки и связи видны

## Структура папок

```
vault/
├── 00-Inbox/        — быстрые заметки, необработанное
├── 01-Product/      — продуктовые решения, флоу
├── 02-Technical/    — архитектура, агенты, платформы
├── 03-Monetization/ — тарифы, фичи, апсейл
├── 04-Backlog/      — идеи, бэклог, открытые вопросы
├── 05-Decisions/    — ADR (Architecture Decision Records)
└── assets/          — скриншоты, диаграммы
```

## Graph View

Открыть: Ctrl+G (или кнопка в левой панели)

Цвета:
- 🔵 Синий — #product
- 🟢 Зелёный — #technical  
- 🟠 Оранжевый — #monetization
- ⚫ Серый — #backlog
- 🟣 Фиолетовый — #decision

## Подключение к Claude Code (MCP)

Чтобы Claude мог читать и писать в vault автоматически:

### Шаг 1: Установить плагин "Local REST API" в Obsidian
1. Obsidian → Settings → Community plugins → Browse
2. Найти "Local REST API" (by Adam Coddington)
3. Установить и включить
4. Settings → Local REST API → сгенерировать API key
5. Запомнить порт (по умолчанию 27123)

### Шаг 2: Добавить MCP сервер в Claude Code
Создать или обновить `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "npx",
      "args": ["-y", "mcp-obsidian"],
      "env": {
        "OBSIDIAN_API_KEY": "твой-api-key-из-плагина",
        "OBSIDIAN_HOST": "http://localhost:27123"
      }
    }
  }
}
```

### Шаг 3: Перезапустить Claude Code
После перезапуска Claude сможет:
- Читать заметки: "прочитай Feature Backlog"
- Создавать заметки: "добавь идею в бэклог"
- Обновлять статусы: "отметь Post-Audit Chat как in progress"

## Быстрые команды в Claude Code (после MCP)

```
"Добавь в бэклог: [идея]"
"Обнови статус [фичи] на done"
"Покажи все открытые вопросы"
"Создай ADR для [решения]"
```

## Без MCP (текущий вариант)

Claude читает и пишет файлы напрямую через файловую систему.
Для этого достаточно держать vault открытым в Obsidian — он автоматически
подхватывает изменения в файлах.
