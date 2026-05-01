# KaliGEO Style Guide

Это рабочая инструкция: всё, что нужно, чтобы делать новые презентации,
коммерческие предложения, лендинги и аудит-отчёты в едином стиле KaliGEO.

Источник истины — `Brandbook.html`. Этот документ — текстовая выжимка для AI-агентов
и разработчиков, чтобы можно было собирать новые материалы без необходимости
визуально парсить брендбук каждый раз.

---

## 1. Бренд в одной фразе

KaliGEO делает **GEO** — Generative Engine Optimization. Бренд про точность,
аудит, измеримость в эпоху AI-поиска. Тон: уверенный, прямой, без хайпа,
без «мы команда экспертов». Метафора — лаборатория и геодезия, не SaaS.

**Вайб:** Stripe × FT × Linear × физическая лаборатория. Не Notion, не Vercel-style hero, не AI-стартап-clichés.

---

## 2. Цвета

Только эта палитра. Не вводить новые.

| Токен          | HEX        | Назначение                                                     |
|----------------|------------|----------------------------------------------------------------|
| `--ink`        | `#0F1115`  | Основной чёрный (текст, тёмные слайды)                         |
| `--ink-2`      | `#3A3D45`  | Вторичный текст                                                |
| `--ink-3`      | `#6A6D75`  | Метки, подписи, лейблы                                         |
| `--bone`       | `#FAFAF7`  | Основной фон (тёплый off-white). НЕ #FFFFFF                    |
| `--bone-2`     | `#F2F1EB`  | Альтернативный светлый фон для секций                          |
| `--rule`       | `#E5E5E1`  | Бордеры, разделители                                           |
| `--accent`     | `#C8F24A`  | **Единственный акцент.** Lime. Используется ОЧЕНЬ дозированно. |
| `--accent-ink` | `#0F1115`  | Текст поверх акцента                                           |

### Правила использования цвета

- **`--bone`, не `#fff`.** Чистый белый запрещён.
- **`--accent` — это специя.** Один lime-элемент на слайд, максимум два.
  Никогда не делать lime-фон большой площади. Никогда не делать lime-текст
  длиннее 1–2 слов или одной цифры.
- **Никаких градиентов.** Plate flat colors. Если нужно «глубокое» тёмное —
  используй `--ink` с border `1px solid #2A2D35`.
- **Никаких теней box-shadow** на UI. Допустима тонкая граница.
- Тёмные слайды (`background: var(--ink)`) используются для драматических
  моментов: cover, comparison hero, CTA. Не более 1 из 3 слайдов подряд.

---

## 3. Типографика

Три гарнитуры. Никогда не подменять.

| Роль                          | Шрифт                  | Вес/стиль          |
|-------------------------------|------------------------|--------------------|
| Заголовки, цитаты             | **Instrument Serif**   | Regular + Italic   |
| Цифры, UI, body, кнопки       | **Inter Tight**        | 400 / 600 / 800 / 900 |
| Лейблы, метки, подписи        | **JetBrains Mono**     | 400 / 500          |

Подключение (Google Fonts):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;600;800;900&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Типошкала для презентаций (1920×1080)

| Роль                          | Размер   | Шрифт              | Заметки                          |
|-------------------------------|----------|--------------------|----------------------------------|
| Display (cover hero)          | 96–128px | Instrument Serif   | line-height 1.0–1.05             |
| Section header                | 72–96px  | Instrument Serif   | курсив для подзаголовка          |
| Slide title                   | 56–72px  | Instrument Serif   |                                  |
| Stat — main number            | 144–220px| Inter Tight 900    | letter-spacing -0.04em           |
| Stat — secondary              | 64–96px  | Inter Tight 800    |                                  |
| Body                          | 22–28px  | Inter Tight 400    | line-height 1.5                  |
| Quote                         | 48–64px  | Instrument Serif italic | line-height 1.2             |
| Eyebrow / labels              | 12–14px  | JetBrains Mono     | uppercase, letter-spacing 0.08em |
| Type-tag (ID слайда)          | 11–13px  | JetBrains Mono     | uppercase, color `--ink-3`       |

### Типошкала для лендинга / web

| Роль                  | Размер  | Заметки                              |
|-----------------------|---------|--------------------------------------|
| Hero display          | 72–112px| Instrument Serif                     |
| H2                    | 48–64px | Instrument Serif                     |
| H3                    | 28–36px | Instrument Serif или Inter Tight 800 |
| Body                  | 16–18px | Inter Tight 400, line-height 1.6     |
| Eyebrow               | 11–12px | JetBrains Mono uppercase             |

### Правила набора

- `text-wrap: balance` для заголовков, `text-wrap: pretty` для параграфов.
- `letter-spacing: -0.02em` для display Inter Tight, `-0.04em` для очень крупных цифр (>96px).
- Курсив (Instrument Serif Italic) — один-два слова в фразе для акцента, не вся строка.
- Никогда не центрировать длинные параграфы. Только короткие заголовки.
- max-width body: 60–70 символов в строке.

---

## 4. Сетка и композиция слайдов

### Базовый каркас слайда (1920×1080)

Каждый слайд — это сетка `auto / 1fr / auto` по вертикали:

```css
.slide{
  display: grid;
  grid-template-rows: auto 1fr auto;
  padding: 96px 120px;          /* для 1920×1080 */
  gap: 32px;
}
.slide > .eyebrow { align-self: start; }   /* мото-лейбл сверху */
.slide > .content { align-self: center; }  /* основной контент по ЦЕНТРУ */
.slide > .type-tag{ align-self: end; justify-self: end; }
```

**Правило:** контент всегда визуально центрируется по высоте. Eyebrow — вверху,
type-tag — внизу справа. Никаких слайдов с контентом, прижатым к низу/верху —
презентация должна листаться без визуального дребезга.

### Сетка для превью брендбука (превью-режим, 16:9)

Те же правила, padding 28–40px, шрифты сжимаются пропорционально.

---

## 5. Паттерны слайдов

Все паттерны есть в `Brandbook.html` секция «Эталонные слайды». Вот их каталог:

### 01 · Title (cover)
- Тёмный фон (`--ink`).
- Серифный заголовок 96–128px в 2 строки.
- Lime monotag + outlined monotag (категория клиента + scale-инфо).
- 1 строка описания снизу 12–14px.

### 02 · Section header
- Светлый фон (`--bone`).
- Большой серифный заголовок + курсивный sub-заголовок (ритм «утверждение → разворот»).
- Одна строка пояснения. Больше ничего.

### 03A · Stat — sparkline
- Огромная цифра (128–220px, Inter Tight 900) + `%` или единица lime цветом.
- Справа: monotag «↗ +N п.п. за N лет», sparkline 5 точек, диапазон годов.
- Под цифрой одна строка прозы курсивом — что эта цифра значит.

### 03B · Stat — donut
- Круговая диаграмма (170×170, stroke-width 10), lime-арка на серой подложке.
- Цифра в центре круга: 64px Inter Tight 900, `%` как индекс справа сверху (24px).
- Справа от круга: серифная фраза 22–28px, под ней моно-источник.

### 03C · Stat — comparison hero (before/after)
- Тёмный фон.
- Сетка `1fr auto 1fr`: цифра до (приглушённо-серая) → стрелка lime → цифра после (крупнее, lime-акцент).
- Пояснение снизу 13–14px светло-серым.

### 04 · Quote slide
- Светло-бежевый фон (`--bone-2`).
- Цитата 32–64px Instrument Serif Italic в кавычках «…».
- Имя автора — JetBrains Mono или Inter Tight маленьким, с тире.

### 05 · Comparison (table-like)
- Две карточки рядом. Левая — нейтральная (`--bone`), правая — с lime подложкой
  (`color-mix(in oklab, accent 18%, bone)`).
- В каждой: моно-лейбл, крупная цифра, одна строка пояснения.

### 06 · CTA slide
- Тёмный фон.
- Заголовок «действие → ценность» + курсивный кикер второй строкой.
- Одна lime-кнопка + моно-метка дефицита/срочности рядом.

### Дополнительные паттерны (можно вывести из существующих)

- **Process / Roadmap** — 3–5 пронумерованных шагов в один ряд. Использовать
  моно-индекс `01 → 02 → 03`, серифный заголовок шага, body снизу. Lime — на
  активном/последнем шаге.
- **Logo wall / Trust** — сетка 4×2 серых названий клиентов (text-only, без
  логотипов-картинок). Outlined в `--rule`, без фонов.
- **Pricing / Tiers** — 2–3 карточки. Одна выделена lime-border. Цифры цены
  крупные (Inter Tight 800). Бенефиты — список без иконок, с моно-маркером `—`.
- **FAQ** — заголовок + accordion. Вопросы Inter Tight 600, ответы Inter Tight 400.
- **Team / Bio** — серифное имя 36px, моно-роль, body 14px. Без аватарок;
  если нужны — placeholder-квадраты `--rule`.

---

## 6. Компоненты

### Кнопки

```css
.btn { font-family:'Inter Tight'; font-weight:600; font-size:14px;
       padding:12px 18px; border-radius:8px; border:1px solid var(--rule);
       background:transparent; color:var(--ink); }
.btn-accent { background:var(--accent); border-color:var(--accent);
              color:var(--accent-ink); font-weight:700; }
.btn-ink    { background:var(--ink); color:var(--bone); border-color:var(--ink); }
```

Иконка стрелки `→` всегда после текста, отступ через `gap`.

### Лейблы (eyebrow, monotag)

```css
.eyebrow { font-family:'JetBrains Mono'; font-size:11px;
           letter-spacing:.08em; text-transform:uppercase;
           color:var(--ink-3); }
.eyebrow::before { content:"— "; }   /* фирменное тире спереди */

.monotag { font-family:'JetBrains Mono'; font-size:9–11px;
           letter-spacing:.08em; text-transform:uppercase;
           padding:4px 8px; border-radius:4px;
           border:1px solid var(--rule); color:var(--ink-2); }
.monotag.solid { background:var(--accent); border-color:var(--accent);
                 color:var(--accent-ink); }
```

### Карточки

Border 1px solid `--rule`, border-radius 12–14px. Никаких теней. Padding 24–28px.
Активная карточка — border `--accent` или background `color-mix(in oklab, var(--accent) 18%, var(--bone))`.

### Линии и разделители

`border: 1px solid var(--rule)`. Для секционных разделителей — `border-top` поверх
`--bone-2` секции.

---

## 7. Tone of voice (русский)

- **Утверждение, не вопрос.** «Поиск не умер. Он стал диалогом.» — не «А вы знали…»
- **Ритм короткой пары.** Заявление + разворот. Часто через точку.
- **Прямые цифры, источник рядом.** Каждая стата — с подписью источника
  (моно-лейбл, n=…, период).
- **Конкретика, не общие места.** «73% цитируется в ChatGPT за 42 дня», не
  «значительный рост видимости».
- **Никаких маркетинговых клише:** «трансформируем», «синергия», «эксперты»,
  «инновационные решения», «помогаем бизнесу расти», «уникальный подход».
- **Курсив (Instrument Serif Italic) — для подкрутки одной мысли.** «через AI»,
  «раньше, чем конкурент». Не для целых фраз.

---

## 8. Иконография и иллюстрации

- **Иконки запрещены по умолчанию.** Если нужна стрелка — Unicode `→ ↗ ↘`.
  Lucide/Phosphor/Heroicons — нет.
- **Иллюстрации — нет.** Особенно не genAI-иллюстрации, не isometric,
  не 3D-рендеры абстрактных шапок.
- **Графики — да**, но только утилитарные: sparkline, donut, bar, простой
  area-chart. Цвета — только из палитры.
- **Фотографии** — только реальные, документальные, ч/б или притушенные. Не сток.
- **Лого клиентов** — текстом в SF/Inter Bold или их реальные wordmark в
  `--ink-3`. Не цветные.

---

## 9. Запрещённое (anti-patterns)

❌ Эмодзи в заголовках, кнопках, body
❌ Иконки-стоки (Lucide/Phosphor/Heroicons)
❌ Градиентные фоны (linear/radial), conic-gradient, mesh-gradient
❌ Box-shadow на чём угодно (drop-shadow, glow)
❌ Цветные хайлайт-плашки за словами в тексте
❌ Капс-локом длиннее лейбла (только в monotag и eyebrow)
❌ Чистый `#ffffff` фон — только `--bone`
❌ Розовый, фиолетовый, бирюзовый, оранжевый — нет.  Только `--accent` lime
❌ Карточки с акцент-border слева цветной полоской («info-callout»)
❌ Stock-фото из Unsplash тёплых тонов, девушек с ноутбуком
❌ AI-иллюстрации в духе «3D-blob с глазами»
❌ Roboto, Arial, Lato, Open Sans, Montserrat, Poppins — нет
❌ Слова: «трансформация», «решение», «синергия», «эксперты», «инновации»

---

## 10. Чек-лист перед отгрузкой

- [ ] Все слайды имеют единую сетку: eyebrow сверху, контент по центру, type-tag снизу справа
- [ ] Главная цифра/заголовок на слайде — крупная, не мельче минимума шкалы
- [ ] Один lime-элемент на слайд (или меньше)
- [ ] Нет градиентов, нет теней, нет emoji
- [ ] Все шрифты — только Instrument Serif / Inter Tight / JetBrains Mono
- [ ] Каждая цифра имеет источник (моно-лейбл рядом)
- [ ] Заголовки набраны с `text-wrap: balance`
- [ ] Body-параграфы не центрированы, max-width 60–70 символов
- [ ] Тёмных слайдов не больше 30% от общего числа
- [ ] Воспроизведено хотя бы 3 разных паттерна слайда (не 10 одинаковых stat-слайдов)

---

## 11. Технические артефакты

- `tokens.css` — CSS-переменные и базовые классы. Импортируй первым.
- `slide-template.html` — стартовый шаблон одного слайда.
- `Brandbook.html` — визуальный референс. Открой при сомнениях.
