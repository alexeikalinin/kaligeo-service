# KaliGEO Brandbook

tags: #product #design #brandbook

Источник: `kaligeo-brandbook-export/` в корне проекта.

## Суть бренда

**GEO** — Generative Engine Optimization. Точность, аудит, измеримость.
Вайб: **Stripe × FT × Linear × физическая лаборатория.**
НЕ: SaaS-клише, AI-стартап, Notion-style.

---

## Цвета

| Токен | HEX | Применение |
|---|---|---|
| `--ink` | `#0F1115` | Основной текст, тёмные блоки |
| `--ink-2` | `#3A3D45` | Вторичный текст |
| `--ink-3` | `#6A6D75` | Метки, подписи |
| `--bone` | `#FAFAF7` | Основной фон (не #fff!) |
| `--bone-2` | `#F2F1EB` | Альтернативный фон |
| `--rule` | `#E5E5E1` | Бордеры, разделители |
| `--accent` | `#C8F24A` | Единственный акцент (lime) |
| `--accent-ink` | `#0F1115` | Текст поверх акцента |

**Правила:**
- `--bone` везде вместо #fff
- `--accent` — один элемент на блок, максимум два
- Никаких градиентов, никаких теней

---

## Шрифты

| Роль | Шрифт |
|---|---|
| Заголовки, цитаты | **Instrument Serif** |
| UI, body, кнопки, цифры | **Inter Tight** 400/600/800/900 |
| Лейблы, метки, монospace | **JetBrains Mono** |

---

## Компоненты

### Eyebrow (метка)
```css
font-family: JetBrains Mono; font-size: 11px;
letter-spacing: .08em; text-transform: uppercase;
color: --ink-3;
```
Перед текстом: `— ` (тире + пробел)

### Monotag (чип)
```css
border: 1px solid --rule; border-radius: 4px;
padding: 4px 8px; font-size: 10px;
font-family: JetBrains Mono; uppercase;
```
Вариант `.monotag-solid` → accent фон (lime).

### Кнопки
- Default: border --rule, прозрачный фон
- Accent: background --accent, color --accent-ink, font-weight 700
- Ink: background --ink, color --bone

### Карточки
- `border: 1px solid --rule; border-radius: 14px; padding: 28px`
- Никаких теней
- Активная: border --accent или фон с mix(accent 16%, bone)

---

## Запрещено

- #ffffff (только --bone)
- Градиенты любые
- box-shadow / glow
- Emoji в заголовках и UI
- Иконки из библиотек (Lucide, Heroicons)
- Цветные полосы слева у карточек
- Слова: "трансформация", "синергия", "эксперты", "инновации"
- Шрифты: Roboto, Montserrat, Poppins и любые другие кроме трёх брендбучных

---

## Применено в проекте

- [x] `app/globals.css` — CSS-переменные и базовые классы
- [x] `app/layout.tsx` — шрифты через Google Fonts
- [x] `app/chat/page.tsx` — переделан под брендбук
- [ ] `components/report/` — обновить компоненты отчёта
- [ ] `components/pdf/ReportPDFDocument.tsx` — обновить PDF
- [ ] `app/admin/` — обновить admin UI

## Связанные заметки
- [[Product Vision]]
- [[User Journey]]
