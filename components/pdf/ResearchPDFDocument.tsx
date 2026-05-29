import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"
import path from "path"

// Register PT Sans — Cyrillic support
Font.register({
  family: "PTSans",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/PTSans-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "public/fonts/PTSans-Bold.ttf"),    fontWeight: 700 },
  ],
})

const C = {
  bone:    "#FAFAF7",
  bone2:   "#F2F2ED",
  ink:     "#0F1115",
  ink2:    "#374151",
  ink3:    "#9CA3AF",
  lime:    "#A3E635",
  limeInk: "#0F1115",
  rule:    "#E4E2D8",
  cover:   "#0F1115",
  danger:  "#DC2626",
  warn:    "#D97706",
  success: "#16A34A",
}

const FONT = "PTSans"

const s = StyleSheet.create({
  // ── Pages
  cover:   { backgroundColor: C.cover, padding: "48pt 52pt", flex: 1 },
  page:    { backgroundColor: C.bone, paddingTop: 40, paddingBottom: 48, paddingHorizontal: 48, flex: 1, fontFamily: FONT, fontSize: 10, color: C.ink },

  // ── Cover
  coverTag:   { fontFamily: FONT, fontSize: 8, color: C.ink3, letterSpacing: 2, marginBottom: 8 },
  coverTitle: { fontFamily: FONT, fontWeight: 700, fontSize: 44, color: C.bone, lineHeight: 1.1, marginTop: 44, marginBottom: 0 },
  coverSub:   { fontFamily: FONT, fontSize: 14, color: C.ink3, marginTop: 12, lineHeight: 1.5 },
  coverLime:  { fontFamily: FONT, fontWeight: 700, fontSize: 12, color: C.lime, marginTop: 8 },

  // ── Section header
  sectionHeader: {
    backgroundColor: C.ink,
    marginHorizontal: -48,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTag:   { fontFamily: FONT, fontSize: 7.5, color: C.lime, letterSpacing: 2, fontWeight: 700 },
  sectionTitle: { fontFamily: FONT, fontWeight: 700, fontSize: 16, color: C.bone },

  // ── Typography
  h2:   { fontFamily: FONT, fontWeight: 700, fontSize: 13, color: C.ink, marginTop: 16, marginBottom: 6 },
  h3:   { fontFamily: FONT, fontWeight: 700, fontSize: 11, color: C.ink, marginBottom: 3 },
  body: { fontFamily: FONT, fontSize: 10, color: C.ink2, lineHeight: 1.6, marginBottom: 8 },
  small: { fontFamily: FONT, fontSize: 8.5, color: C.ink3, lineHeight: 1.5 },
  mono:  { fontFamily: FONT, fontSize: 8, color: C.ink3, letterSpacing: 1 },

  // ── Highlight box
  box:      { backgroundColor: C.bone2, borderRadius: 6, padding: "12pt 14pt", marginBottom: 12 },
  boxLime:  { backgroundColor: C.bone2, borderRadius: 6, padding: "12pt 14pt", marginBottom: 12, borderLeft: `3pt solid ${C.lime}` },
  boxGreen: { backgroundColor: "#f0fdf4", borderRadius: 6, padding: "12pt 14pt", marginBottom: 12, borderLeft: `3pt solid ${C.success}` },

  // ── Stat card
  statGrid: { flexDirection: "row", gap: 8, marginBottom: 14 },
  statCard: { flex: 1, backgroundColor: C.bone2, borderRadius: 6, padding: "10pt 12pt", borderTop: `2pt solid ${C.lime}` },
  statVal:  { fontFamily: FONT, fontWeight: 700, fontSize: 26, color: C.ink, lineHeight: 1 },
  statLbl:  { fontFamily: FONT, fontSize: 8, color: C.ink3, marginTop: 3, lineHeight: 1.3 },

  // ── Table
  tableWrap:  { borderRadius: 4, overflow: "hidden", marginBottom: 12, border: `0.5pt solid ${C.rule}` },
  tableHead:  { flexDirection: "row", backgroundColor: C.ink, padding: "7pt 10pt" },
  tableRow:   { flexDirection: "row", padding: "6pt 10pt", borderTop: `0.5pt solid ${C.rule}`, backgroundColor: C.bone },
  tableRowAlt:{ flexDirection: "row", padding: "6pt 10pt", borderTop: `0.5pt solid ${C.rule}`, backgroundColor: C.bone2 },
  thCell:     { fontFamily: FONT, fontWeight: 700, fontSize: 8, color: C.bone, letterSpacing: 0.5 },
  tdCell:     { fontFamily: FONT, fontSize: 9, color: C.ink2 },
  tdBold:     { fontFamily: FONT, fontWeight: 700, fontSize: 9, color: C.ink },

  // ── Checklist
  checkRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7, gap: 8 },
  checkBox: { width: 13, height: 13, border: `1pt solid ${C.rule}`, borderRadius: 2, marginTop: 1, flexShrink: 0 },
  checkText:{ fontFamily: FONT, fontSize: 10, color: C.ink2, flex: 1, lineHeight: 1.5 },

  // ── Numbered item
  numBadge: { width: 22, height: 22, backgroundColor: C.lime, borderRadius: 4, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  numText:  { fontFamily: FONT, fontWeight: 700, fontSize: 9, color: C.limeInk },
  numRow:   { flexDirection: "row", gap: 10, marginBottom: 12, alignItems: "flex-start" },
  numBody:  { flex: 1 },

  // ── Severity bar
  sevRow:   { flexDirection: "row", gap: 10, marginBottom: 10, alignItems: "flex-start" },
  sevBar:   { width: 3, borderRadius: 2, flexShrink: 0, alignSelf: "stretch" },

  // ── Cover stats
  covStatRow: { flexDirection: "row", gap: 0, marginTop: 44, borderTop: `1pt solid ${C.ink2}`, paddingTop: 20 },
  covStat:    { flex: 1, paddingRight: 20 },
  covStatVal: { fontFamily: FONT, fontWeight: 700, fontSize: 30, color: C.bone, lineHeight: 1 },
  covStatLbl: { fontFamily: FONT, fontSize: 9, color: C.ink3, marginTop: 4 },

  // ── Footer
  footer:     { position: "absolute", bottom: 20, left: 48, right: 48, flexDirection: "row", justifyContent: "space-between", borderTop: `0.5pt solid ${C.rule}`, paddingTop: 8 },
  footerText: { fontFamily: FONT, fontSize: 7.5, color: C.ink3 },

  // ── Divider
  divider: { borderTop: `0.5pt solid ${C.rule}`, marginVertical: 12 },
})

// ── Sub-components ──────────────────────────────────────────────────────────

function Footer({ page, total }: { page: number; total: number }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>KaliGEO · Состояние GEO в России 2026 · kaligeo.ru</Text>
      <Text style={s.footerText}>{page} / {total}</Text>
    </View>
  )
}

function SectionHeader({ tag, title }: { tag: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionTag}>{tag}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  )
}

function StatGrid({ items }: { items: { val: string; label: string }[] }) {
  return (
    <View style={s.statGrid}>
      {items.map(({ val, label }) => (
        <View key={label} style={s.statCard}>
          <Text style={s.statVal}>{val}</Text>
          <Text style={s.statLbl}>{label}</Text>
        </View>
      ))}
    </View>
  )
}

function Table({
  headers, rows, widths, alt,
}: {
  headers: string[]
  rows: (string | { text: string; bold?: boolean; color?: string })[][]
  widths: number[]
  alt?: boolean
}) {
  return (
    <View style={s.tableWrap}>
      <View style={s.tableHead}>
        {headers.map((h, i) => (
          <Text key={i} style={{ ...s.thCell, flex: widths[i] }}>{h}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={alt && ri % 2 === 1 ? s.tableRowAlt : s.tableRow}>
          {row.map((cell, ci) => {
            const txt = typeof cell === "string" ? cell : cell.text
            const bold = typeof cell === "object" && cell.bold
            const color = typeof cell === "object" && cell.color ? cell.color : undefined
            return (
              <Text key={ci} style={{ ...(bold ? s.tdBold : s.tdCell), flex: widths[ci], color: color ?? (bold ? C.ink : C.ink2) }}>
                {txt}
              </Text>
            )
          })}
        </View>
      ))}
    </View>
  )
}

function NumItem({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View style={s.numRow}>
      <View style={s.numBadge}><Text style={s.numText}>{String(n).padStart(2, "0")}</Text></View>
      <View style={s.numBody}>
        <Text style={s.h3}>{title}</Text>
        <Text style={s.body}>{body}</Text>
      </View>
    </View>
  )
}

function CheckItem({ text }: { text: string }) {
  return (
    <View style={s.checkRow}>
      <View style={s.checkBox} />
      <Text style={s.checkText}>{text}</Text>
    </View>
  )
}

function SevItem({ title, pct, color, body }: { title: string; pct: string; color: string; body: string }) {
  return (
    <View style={s.sevRow}>
      <View style={{ ...s.sevBar, backgroundColor: color, minHeight: 40 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 2 }}>
          <Text style={{ ...s.h3, flex: 1, marginBottom: 0 }}>{title}</Text>
          <View style={{ backgroundColor: color + "22", borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
            <Text style={{ fontFamily: FONT, fontWeight: 700, fontSize: 7.5, color }}>{pct}</Text>
          </View>
        </View>
        <Text style={s.small}>{body}</Text>
      </View>
    </View>
  )
}

// ── Document ────────────────────────────────────────────────────────────────

export default function ResearchPDFDocument() {
  const T = 10

  return (
    <Document title="Состояние GEO в России 2026 — KaliGEO" author="KaliGEO">

      {/* ── 1. COVER ─────────────────────────────────────────────────────── */}
      <Page size="A4" style={s.cover}>
        {/* Lime top stripe */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: C.lime }} />

        <Text style={s.coverTag}>KALIGEO  ·  ИССЛЕДОВАНИЕ  ·  АВГУСТ 2026</Text>

        <Text style={s.coverTitle}>{"Состояние\nGEO\nв России\n2026"}</Text>

        <Text style={s.coverSub}>Как российские бренды представлены в нейросетях</Text>
        <Text style={s.coverLime}>Исследование на основе 200+ аудитов</Text>

        {/* Stats row */}
        <View style={s.covStatRow}>
          {[
            { val: "200+", lbl: "аудитов" },
            { val: "8",    lbl: "AI-платформ" },
            { val: "12",   lbl: "отраслей" },
            { val: "40K+", lbl: "запросов" },
          ].map(({ val, lbl }, i) => (
            <View key={i} style={s.covStat}>
              <Text style={s.covStatVal}>{val}</Text>
              <Text style={s.covStatLbl}>{lbl}</Text>
            </View>
          ))}
        </View>

        <View style={{ position: "absolute", bottom: 28, left: 52, right: 52 }}>
          <Text style={{ fontFamily: FONT, fontSize: 8, color: C.ink3 }}>
            kaligeo.ru · Данные: март–июль 2026 · Распространение разрешено со ссылкой на источник
          </Text>
        </View>
      </Page>

      {/* ── 2. ВВЕДЕНИЕ + МЕТОДОЛОГИЯ ───────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <SectionHeader tag="ВВЕДЕНИЕ" title="Почему мы написали это" />

        <Text style={s.body}>
          В конце 2025 года к нам приходили компании с одним вопросом — «почему конкурент в ChatGPT, а мы нет?».
          За несколько месяцев этот вопрос задали сотни раз. К середине 2026 года у нас накопилось достаточно данных,
          чтобы дать системный ответ.
        </Text>

        <StatGrid items={[
          { val: "35%",  label: "информационно-коммерческих запросов проходят через AI" },
          { val: "67%",  label: "пользователей 18–35 лет использовали AI для рекомендаций" },
          { val: "12М+", label: "ежемесячных пользователей ChatGPT в России" },
        ]} />

        <View style={s.divider} />

        <Text style={{ ...s.h2, marginTop: 0 }}>Методология</Text>
        <View style={s.boxLime}>
          <Text style={{ ...s.body, marginBottom: 0 }}>
            Выборка: 214 завершённых GEO-аудитов, март–июль 2026.
            По каждому бренду генерировался набор из 15–50 запросов, отражающих реальные формулировки пользователей.
            Каждый запрос отправлялся на 8 платформ: ChatGPT, Claude, Gemini, Perplexity, DeepSeek, YandexGPT, GigaChat, Алиса.
          </Text>
        </View>

        <Table
          headers={["Ниша", "Доля выборки"]}
          widths={[4, 1]}
          alt
          rows={[
            ["IT-продукты и SaaS", "31%"],
            ["Консалтинг и услуги B2B", "24%"],
            ["Производство и промышленность", "19%"],
            ["Розница и e-commerce", "14%"],
            ["Прочее (недвижимость, HoReCa, финтех)", "12%"],
          ]}
        />

        <Footer page={2} total={T} />
      </Page>

      {/* ── 3. КЛЮЧЕВЫЕ ЦИФРЫ ───────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <SectionHeader tag="КЛЮЧЕВЫЕ ЦИФРЫ" title="Медианные показатели рынка" />

        <StatGrid items={[
          { val: "8%",  label: "Медианная GEO-видимость" },
          { val: "13%", label: "Средняя GEO-видимость" },
          { val: "38%", label: "Брендов с видимостью ниже 5%" },
        ]} />

        <Text style={s.body}>
          Типичный российский бренд упоминается нейросетями примерно в каждом 12-м ответе на релевантные
          запросы ниши. Бренды, активно работающие над GEO 3–6 месяцев, показывают результаты
          в 3–4 раза выше медианы.
        </Text>

        <Table
          headers={["Показатель", "Значение"]}
          widths={[4, 1]}
          alt
          rows={[
            [{ text: "Медианная GEO-видимость", bold: true }, { text: "8%", bold: true }],
            ["Средняя GEO-видимость", "13%"],
            ["Топ-25% брендов", "28%+"],
            ["Топ-10% брендов", "41%+"],
            ["Бренды с видимостью ниже 5%", "38%"],
          ]}
        />

        <View style={s.divider} />
        <Text style={s.h2}>Динамика за 6 месяцев</Text>
        <Text style={s.small}>Для 47 компаний из выборки, прошедших повторный аудит через 3+ месяца:</Text>

        <Table
          headers={["Уровень активности", "Изменение видимости"]}
          widths={[4, 1]}
          rows={[
            [{ text: "Активно работали по плану (6+ действий)", bold: true }, { text: "+19 п.п.", bold: true, color: C.success }],
            ["Сделали 2–5 действий из плана", { text: "+8 п.п.", color: C.success }],
            ["Ничего не предпринимали", { text: "−1 п.п.", color: C.danger }],
          ]}
        />

        <Footer page={3} total={T} />
      </Page>

      {/* ── 4. ПЛАТФОРМЫ ────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <SectionHeader tag="ПЛАТФОРМЫ" title="Где бренды видны, а где нет" />

        <Table
          headers={["Платформа", "Медиана", "Комментарий"]}
          widths={[1.4, 0.7, 3.4]}
          alt
          rows={[
            [{ text: "YandexGPT / Алиса", bold: true }, { text: "18%", bold: true, color: C.success }, "Лучший результат для РФ-брендов — экосистема Яндекса"],
            ["ChatGPT (GPT-4o)", { text: "12%", color: C.ink }, "Ориентируется на Хабр, vc.ru, Wikipedia"],
            ["GigaChat", { text: "11%", color: C.ink }, "Корпоративные базы и Сбер-экосистема"],
            ["DeepSeek", { text: "9%", color: C.ink }, "Растущая аудитория, данные обновляются активно"],
            ["Gemini", { text: "8%", color: C.warn }, "Глобальный охват, РФ-бренды представлены слабее"],
            ["Perplexity", { text: "7%", color: C.warn }, "Live-поиск, цитирует актуальные публикации"],
            ["Claude", { text: "5%", color: C.danger }, "Самый низкий — обучен преимущественно на западных данных"],
          ]}
        />

        <View style={s.divider} />
        <Text style={s.h2}>Топ-3 источника, которые цитируют нейросети</Text>

        <NumItem n={1} title="Профессиональные площадки" body="Хабр, vc.ru, tproger — цитируются в 61% ответов ChatGPT и Claude" />
        <NumItem n={2} title="Отраслевые каталоги и рейтинги" body="Упоминаются в 48% ответов. Особенно важны для B2B-ниш." />
        <NumItem n={3} title="Яндекс.Справочник и Google My Business" body="44% ответов, особенно актуально для YandexGPT и Алисы" />

        <View style={s.boxLime}>
          <Text style={{ ...s.body, marginBottom: 0 }}>
            Нейросети рекомендуют на основе того, что о вас написали другие, а не то, что написали вы сами.
            Корпоративный сайт как прямой источник упоминается лишь в 19% случаев.
          </Text>
        </View>

        <Footer page={4} total={T} />
      </Page>

      {/* ── 5. ОТРАСЛИ ──────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <SectionHeader tag="ОТРАСЛИ" title="Отраслевой рейтинг GEO-видимости" />

        <Table
          headers={["Ниша", "Медиана", "Топ-25%", "Причина разрыва"]}
          widths={[1.9, 0.65, 0.65, 2.8]}
          alt
          rows={[
            [{ text: "IT / SaaS", bold: true }, { text: "19%", bold: true, color: C.success }, "38%+", "Много обзоров, Product Hunt, Хабр"],
            ["Консалтинг / агентства", { text: "14%", color: C.success }, "31%+", "Контент-маркетинг, личные бренды"],
            ["Образование", { text: "12%", color: C.ink }, "28%+", "Обзоры курсов, рейтинги платформ"],
            ["Производство B2B", { text: "7%", color: C.warn }, "18%+", "Мало публичного контента"],
            ["Розничная торговля", { text: "5%", color: C.warn }, "14%+", "Конкуренция с маркетплейсами"],
            ["Недвижимость", { text: "4%", color: C.danger }, "12%+", "Локальный рынок слабо представлен"],
            ["HoReCa", { text: "3%", color: C.danger }, "9%+", "Нейросети плохо знают локальный общепит"],
          ]}
        />

        <View style={s.boxLime}>
          <Text style={{ ...s.h3, marginBottom: 4 }}>Главный вывод</Text>
          <Text style={{ ...s.body, marginBottom: 0 }}>
            Чем больше публичного профессионального контента создаёт ниша в целом — тем выше средняя GEO-видимость
            всех игроков. В IT это сложившаяся культура. В производстве и недвижимости — белое пятно,
            которое можно занять первым.
          </Text>
        </View>

        <Footer page={5} total={T} />
      </Page>

      {/* ── 6. ЛИДЕРЫ ───────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <SectionHeader tag="ЛИДЕРЫ РЫНКА" title="5 общих черт брендов с GEO 30%+" />
        <Text style={{ ...s.small, marginBottom: 12 }}>Анализ 22 компаний с видимостью выше 30%</Text>

        <NumItem n={1} title="Присутствие на авторитетных площадках" body="У 91% лидеров — минимум 2 публикации на Хабре, vc.ru или отраслевых порталах за последние 12 месяцев. Не рекламные тексты, а экспертные материалы, которые цитируются и обсуждаются." />
        <NumItem n={2} title="Структурированные данные на сайте" body="82% лидеров используют Schema.org-разметку (Organization, Product, FAQ). Это прямо влияет на попадание в Google AIO и косвенно — на то, как нейросети описывают компанию." />
        <NumItem n={3} title="Отзывы на профильных платформах" body="78% лидеров имеют 20+ отзывов на Яндекс.Картах, Google Maps или отраслевых агрегаторах. GigaChat и YandexGPT активно используют эти данные." />
        <NumItem n={4} title="Wikipedia или независимый рейтинг" body="64% лидеров упомянуты в Wikipedia, авторитетном рейтинге или независимом исследовании. Один из самых весомых сигналов для LLM." />
        <NumItem n={5} title="Последовательное позиционирование" body="У 100% лидеров — чёткое описание специализации во всех публичных источниках. Противоречивые описания снижают уверенность модели в рекомендации." />

        <Footer page={6} total={T} />
      </Page>

      {/* ── 7. ПРИЧИНЫ ──────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <SectionHeader tag="ПРИЧИНЫ НИЗКОЙ ВИДИМОСТИ" title="Топ-5 ошибок (80%+ аудитов)" />

        <SevItem
          title="Нет экспертного контента на авторитетных площадках"
          pct="84%" color={C.danger}
          body="Компания хорошо описана на собственном сайте, но нет публикаций на Хабре, vc.ru или отраслевых порталах. Решение: 1–2 экспертные статьи по профессиональной теме."
        />
        <SevItem
          title="Яндекс-монопрезентность"
          pct="71%" color={C.danger}
          body="Хорошо представлена в Яндекс-экосистеме и невидима в Claude, Perplexity, ChatGPT. Решение: расширить присутствие на площадках, которые цитируют западные модели."
        />
        <SevItem
          title="Нет позиции по конкретным запросам ниши"
          pct="68%" color={C.warn}
          body="Много контента, но он не соответствует формулировкам пользователей AI. Решение: переформатировать под FAQ, сравнения, рейтинги."
        />
        <SevItem
          title="Противоречивые описания в разных источниках"
          pct="52%" color={C.warn}
          body="На сайте одно позиционирование, в СМИ — другое. Решение: «золотое описание» (2–3 предложения) и использовать везде."
        />
        <SevItem
          title="Нет присутствия на отраслевых агрегаторах"
          pct="49%" color={C.ink3}
          body="Нет в каталогах и рейтингах, которые LLM активно цитируют. Решение: добавить профиль в 5–7 ключевых агрегаторов ниши."
        />

        <Footer page={7} total={T} />
      </Page>

      {/* ── 8. СРАВНЕНИЕ + ПРОГНОЗ ──────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <SectionHeader tag="СРАВНЕНИЕ" title="Россия vs Глобальный рынок" />

        <Table
          headers={["Параметр", "Россия", "Глобально"]}
          widths={[2.2, 1.6, 1.6]}
          alt
          rows={[
            ["Доминирующая платформа", "Яндекс + ChatGPT", "ChatGPT + Gemini"],
            ["Локальных LLM", "3 (YandexGPT, GigaChat, Алиса)", "0–1"],
            [{ text: "Медианная GEO-видимость", bold: true }, { text: "8%", bold: true }, "~11%"],
            ["Топ-причина низкой видимости", "Яндекс-монопрезентность", "Мало внешних ссылок"],
            ["Главный источник для LLM", "Хабр, vc.ru, Яндекс.Справочник", "Reddit, G2, Wikipedia"],
          ]}
        />

        <View style={s.divider} />
        <Text style={{ ...s.h2, marginTop: 0 }}>Три тренда до конца 2026</Text>

        <NumItem n={1} title="Персонализация AI-рекомендаций" body="Нейросети учитывают геолокацию и контекст пользователя. Бренды, закрепившиеся в AI-ответах сейчас, получат долгосрочное преимущество." />
        <NumItem n={2} title="Рост Perplexity в России" body="Русскоязычная поддержка с 2026-го. Молодые профессионалы переключаются. Нужны публикации на форумах и отраслевых порталах." />
        <NumItem n={3} title="Google AI Overviews в российской выдаче" body="Schema-разметка + авторитетные ссылки дают двойной эффект: Google AIO + Gemini." />

        <View style={s.boxLime}>
          <Text style={{ ...s.body, marginBottom: 0 }}>
            Медиана — 8%. Большинство брендов ещё не занимаются GEO. Первые, кто займёт позиции сейчас,
            закрепятся надолго: LLM медленно «забывают» укоренившиеся упоминания.
          </Text>
        </View>

        <Footer page={8} total={T} />
      </Page>

      {/* ── 9. ЧЕКЛИСТ ──────────────────────────────────────────────────── */}
      <Page size="A4" style={s.page}>
        <SectionHeader tag="ДЕЙСТВИЯ" title="Чеклист: первые 30 дней" />

        <Text style={s.h2}>Неделя 1 — Диагностика</Text>
        <CheckItem text="Запустить GEO-аудит на kaligeo.ru (есть бесплатный быстрый чек без регистрации)" />
        <CheckItem text="Проверить вручную: 5 ключевых запросов ниши в ChatGPT, Алисе и Perplexity" />
        <CheckItem text="Записать, какие конкуренты упоминаются и в каком контексте" />

        <Text style={s.h2}>Неделя 2 — Быстрые победы</Text>
        <CheckItem text="Унифицировать описание компании: сайт, Яндекс.Справочник, Google My Business, соцсети" />
        <CheckItem text="Добавить Schema.org-разметку (Organization, LocalBusiness)" />
        <CheckItem text="Собрать 5–10 новых отзывов на Яндекс.Картах и Google" />

        <Text style={s.h2}>Неделя 3–4 — Контент</Text>
        <CheckItem text="Написать экспертную статью на Хабре или vc.ru — не рекламную, а полезную для ниши" />
        <CheckItem text="Добавить компанию в 3–5 отраслевых каталогов" />
        <CheckItem text="Добавить FAQ по 10 ключевым вопросам ниши с Schema-разметкой на сайт" />

        <View style={s.boxGreen}>
          <Text style={{ ...s.h3, color: C.success }}>Результат через 30 дней</Text>
          <Text style={{ ...s.body, marginBottom: 0 }}>
            По данным 47 повторных аудитов: эти шаги дают +5–8 п.п. к медианной GEO-видимости
            через 4–6 недель после внедрения.
          </Text>
        </View>

        <Footer page={9} total={T} />
      </Page>

      {/* ── 10. CTA ─────────────────────────────────────────────────────── */}
      <Page size="A4" style={{ ...s.cover, justifyContent: "center" }}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 5, backgroundColor: C.lime }} />

        <Text style={s.coverTag}>— СЛЕДУЮЩИЙ ШАГ</Text>
        <Text style={{ ...s.coverTitle, fontSize: 32, marginTop: 16 }}>
          {"Узнайте, как нейросети\nвидят ваш бренд"}
        </Text>

        <Text style={{ ...s.coverSub, marginTop: 20, fontSize: 13 }}>
          Бесплатный быстрый чек: 3 платформы, базовые метрики — без регистрации, за 30 секунд.
        </Text>
        <Text style={{ ...s.coverSub, marginTop: 6, fontSize: 13 }}>
          Полный аудит: 9 платформ · конкурентная матрица · причинный анализ · Action Plan 30/60/90 дней.
        </Text>

        <View style={{ marginTop: 36, flexDirection: "row", alignItems: "center", gap: 16 }}>
          <View style={{ backgroundColor: C.lime, borderRadius: 6, paddingHorizontal: 24, paddingVertical: 14 }}>
            <Text style={{ fontFamily: FONT, fontWeight: 700, fontSize: 14, color: C.limeInk }}>kaligeo.ru →</Text>
          </View>
          <Text style={{ fontFamily: FONT, fontSize: 12, color: C.ink3 }}>Разовая оплата. Без подписки.</Text>
        </View>

        <View style={{ position: "absolute", bottom: 28, left: 52, right: 52 }}>
          <Text style={{ fontFamily: FONT, fontSize: 8, color: C.ink3 }}>
            Исследование KaliGEO · kaligeo.ru · Август 2026 · Данные анонимизированы · Распространение разрешено со ссылкой на источник
          </Text>
        </View>
      </Page>

    </Document>
  )
}
