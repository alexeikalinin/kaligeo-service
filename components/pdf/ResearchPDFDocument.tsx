import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

const C = {
  bone:"#FAFAF7",bone2:"#F2F2ED",ink:"#0F1115",ink2:"#374151",
  ink3:"#9CA3AF",lime:"#A3E635",limeInk:"#0F1115",rule:"#E8E8E3",
  success:"#16A34A",warn:"#D97706",danger:"#DC2626",cover:"#0F1115",
}

const s = StyleSheet.create({
  cover:   { backgroundColor:C.cover, padding:"56pt 52pt", flex:1 },
  page:    { backgroundColor:C.bone, padding:"44pt 48pt 36pt", flex:1, fontFamily:"Helvetica", fontSize:10, color:C.ink },
  coverEyebrow: { fontFamily:"Helvetica", fontSize:8, color:C.ink3, letterSpacing:2, marginBottom:4 },
  coverTitle:   { fontFamily:"Helvetica-Bold", fontSize:38, color:C.bone, marginTop:48, lineHeight:1.15 },
  coverSub:     { fontFamily:"Helvetica", fontSize:13, color:C.ink3, marginTop:10 },
  coverLime:    { fontFamily:"Helvetica-Bold", fontSize:13, color:C.lime, marginTop:6 },
  coverStat:    { flex:1, borderTop:`2pt solid ${C.lime}`, paddingTop:10, marginRight:16 },
  coverStatVal: { fontFamily:"Helvetica-Bold", fontSize:22, color:C.bone },
  coverStatLbl: { fontFamily:"Helvetica", fontSize:8, color:C.ink3, marginTop:2 },
  eyebrow:  { fontFamily:"Helvetica", fontSize:7.5, color:C.ink3, letterSpacing:2, marginBottom:6 },
  h1:       { fontFamily:"Helvetica-Bold", fontSize:22, color:C.ink, marginBottom:12 },
  h2:       { fontFamily:"Helvetica-Bold", fontSize:14, color:C.ink, marginBottom:8, marginTop:16 },
  h3:       { fontFamily:"Helvetica-Bold", fontSize:11, color:C.ink, marginBottom:4 },
  body:     { fontFamily:"Helvetica", fontSize:10, color:C.ink2, lineHeight:1.65, marginBottom:8 },
  small:    { fontFamily:"Helvetica", fontSize:8.5, color:C.ink3, lineHeight:1.5 },
  highlight: { backgroundColor:C.bone2, border:`1pt solid ${C.rule}`, borderRadius:6, padding:"12pt 14pt", marginBottom:12 },
  highlightVal: { fontFamily:"Helvetica-Bold", fontSize:28, color:C.ink, lineHeight:1 },
  highlightLbl: { fontFamily:"Helvetica", fontSize:9, color:C.ink3, marginTop:2 },
  tableHeader: { flexDirection:"row", borderBottom:`1.5pt solid ${C.ink}`, paddingBottom:5, marginBottom:4 },
  tableRow:    { flexDirection:"row", borderBottom:`0.5pt solid ${C.rule}`, paddingVertical:5 },
  tableHeaderCell: { fontFamily:"Helvetica-Bold", fontSize:8, color:C.ink3, letterSpacing:0.5 },
  tableCell:   { fontFamily:"Helvetica", fontSize:9, color:C.ink2 },
  checkRow: { flexDirection:"row", alignItems:"flex-start", marginBottom:7 },
  checkBox: { width:14, height:14, border:`1pt solid ${C.rule}`, borderRadius:3, marginRight:8, marginTop:1, flexShrink:0 },
  checkText:{ fontFamily:"Helvetica", fontSize:10, color:C.ink2, flex:1, lineHeight:1.5 },
  divider:  { borderTop:`0.5pt solid ${C.rule}`, marginVertical:12 },
  footer:   { position:"absolute", bottom:24, left:48, right:48, flexDirection:"row", justifyContent:"space-between" },
  footerText:{ fontFamily:"Helvetica", fontSize:7.5, color:C.ink3 },
  limeBar:  { width:3, backgroundColor:C.lime, marginRight:10, borderRadius:2 },
  numBadge: { width:20, height:20, backgroundColor:C.lime, borderRadius:3, marginRight:10, alignItems:"center", justifyContent:"center", flexShrink:0 },
  numText:  { fontFamily:"Helvetica-Bold", fontSize:9, color:C.limeInk },
  badge:    { borderRadius:3, paddingHorizontal:6, paddingVertical:2, marginRight:6 },
  badgeText:{ fontFamily:"Helvetica-Bold", fontSize:7.5, letterSpacing:0.5 },
})

function Footer({ page, total }: { page: number; total: number }) {
  return (
    <View style={s.footer}>
      <Text style={s.footerText}>KaliGEO · Состояние GEO в России 2026 · kaligeo.ru</Text>
      <Text style={s.footerText}>{page} / {total}</Text>
    </View>
  )
}
function Divider() { return <View style={s.divider} /> }
function StatBox({ val, label }: { val: string; label: string }) {
  return (
    <View style={{ ...s.highlight, flex:1, marginRight:8 }}>
      <Text style={s.highlightVal}>{val}</Text>
      <Text style={s.highlightLbl}>{label}</Text>
    </View>
  )
}
function TR({ cells, widths, bold }: { cells: string[]; widths: number[]; bold?: boolean }) {
  return (
    <View style={bold ? s.tableHeader : s.tableRow}>
      {cells.map((c,i) => <Text key={i} style={{ ...(bold ? s.tableHeaderCell : s.tableCell), flex:widths[i] }}>{c}</Text>)}
    </View>
  )
}
function CheckItem({ text }: { text: string }) {
  return <View style={s.checkRow}><View style={s.checkBox} /><Text style={s.checkText}>{text}</Text></View>
}
function NumItem({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <View style={{ flexDirection:"row", marginBottom:12, alignItems:"flex-start" }}>
      <View style={s.numBadge}><Text style={s.numText}>{String(n).padStart(2,"0")}</Text></View>
      <View style={{ flex:1 }}>
        <Text style={s.h3}>{title}</Text>
        <Text style={s.body}>{body}</Text>
      </View>
    </View>
  )
}

export default function ResearchPDFDocument() {
  const T = 10
  return (
    <Document title="Состояние GEO в России 2026 — KaliGEO" author="KaliGEO">

      {/* Cover */}
      <Page size="A4" style={s.cover}>
        <Text style={s.coverEyebrow}>KALIGEO · ИССЛЕДОВАНИЕ · АВГУСТ 2026</Text>
        <Text style={s.coverTitle}>{"Состояние GEO\nв России\n2026"}</Text>
        <Text style={s.coverSub}>Как российские бренды представлены в нейросетях</Text>
        <Text style={s.coverLime}>Исследование на основе 200+ аудитов</Text>
        <View style={{ flexDirection:"row", marginTop:48 }}>
          {[["200+","аудитов"],["8","AI-платформ"],["12","отраслей"],["40K+","запросов"]].map(([v,l],i)=>(
            <View key={i} style={{ ...s.coverStat, marginRight:i<3?16:0 }}>
              <Text style={s.coverStatVal}>{v}</Text>
              <Text style={s.coverStatLbl}>{l}</Text>
            </View>
          ))}
        </View>
        <View style={{ position:"absolute", bottom:40, left:52, right:52 }}>
          <Text style={{ fontFamily:"Helvetica", fontSize:8, color:C.ink3 }}>
            kaligeo.ru · Данные: март–июль 2026 · Распространение разрешено со ссылкой на источник
          </Text>
        </View>
      </Page>

      {/* Введение + Методология */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>— ВВЕДЕНИЕ</Text>
        <Text style={s.h1}>Почему мы написали это</Text>
        <Text style={s.body}>В конце 2025 года к нам приходили компании с одним вопросом — «почему конкурент в ChatGPT, а мы нет?». За несколько месяцев этот вопрос задали сотни раз. К середине 2026 года у нас накопилось достаточно данных, чтобы дать системный ответ.</Text>
        <View style={{ flexDirection:"row", marginBottom:14 }}>
          <StatBox val="35%" label="информационно-коммерческих запросов идут через AI" />
          <StatBox val="67%" label="пользователей 18–35 использовали AI для рекомендаций" />
          <StatBox val="12М+" label="пользователей ChatGPT в России ежемесячно" />
        </View>
        <Divider />
        <Text style={s.eyebrow}>— МЕТОДОЛОГИЯ</Text>
        <Text style={s.h2}>Как собирали данные</Text>
        <View style={s.highlight}>
          <Text style={{ ...s.body, marginBottom:0 }}>Выборка: 214 завершённых GEO-аудитов, март–июль 2026. По каждому бренду генерировался набор из 15–50 запросов. Каждый запрос отправлялся на 8 платформ: ChatGPT, Claude, Gemini, Perplexity, DeepSeek, YandexGPT, GigaChat, Алиса.</Text>
        </View>
        <TR cells={["Ниша","Доля"]} widths={[4,1]} bold />
        {[["IT-продукты и SaaS","31%"],["Консалтинг и услуги B2B","24%"],["Производство и промышленность","19%"],["Розница и e-commerce","14%"],["Прочее (недвижимость, HoReCa, финтех)","12%"]].map(([a,b])=><TR key={a} cells={[a,b]} widths={[4,1]} />)}
        <Footer page={2} total={T} />
      </Page>

      {/* Ключевые цифры */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>— КЛЮЧЕВЫЕ ЦИФРЫ</Text>
        <Text style={s.h1}>Медианные показатели рынка</Text>
        <View style={{ flexDirection:"row", marginBottom:8 }}>
          <StatBox val="8%" label="Медианная GEO-видимость" />
          <StatBox val="13%" label="Средняя GEO-видимость" />
          <StatBox val="38%" label="Брендов с видимостью < 5%" />
        </View>
        <Text style={s.body}>Типичный российский бренд упоминается нейросетями примерно в каждом 12-м ответе на релевантные запросы ниши. Бренды, работающие над GEO 3–6 месяцев, показывают результаты в 3–4 раза выше медианы.</Text>
        <TR cells={["Показатель","Значение"]} widths={[4,1]} bold />
        {[["Медианная GEO-видимость","8%"],["Средняя GEO-видимость","13%"],["Топ-25% брендов","28%+"],["Топ-10% брендов","41%+"],["Бренды с видимостью < 5%","38%"]].map(([a,b])=><TR key={a} cells={[a,b]} widths={[4,1]} />)}
        <Divider />
        <Text style={s.h2}>Динамика за 6 месяцев</Text>
        <TR cells={["Активность","Изменение"]} widths={[4,1]} bold />
        {[["Активно работали по плану (6+ действий)","+19 п.п."],["Сделали 2–5 действий из плана","+8 п.п."],["Ничего не предпринимали","−1 п.п."]].map(([a,b])=><TR key={a} cells={[a,b]} widths={[4,1]} />)}
        <Footer page={3} total={T} />
      </Page>

      {/* Платформы */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>— ПЛАТФОРМЫ</Text>
        <Text style={s.h1}>Где бренды видны, а где нет</Text>
        <TR cells={["Платформа","Медиана","Примечание"]} widths={[1.5,0.7,3.3]} bold />
        {[["YandexGPT / Алиса","18%","Лучший результат для РФ-брендов"],["ChatGPT (GPT-4o)","12%","Ориентируется на Хабр, vc.ru, Wikipedia"],["GigaChat","11%","Корпоративные базы и Сбер-экосистема"],["DeepSeek","9%","Активно обновляемые данные"],["Gemini","8%","Глобальный охват, РФ слабее"],["Perplexity","7%","Live-поиск, актуальные публикации"],["Claude","5%","Обучен преимущественно на западных данных"]].map(([a,b,c])=><TR key={a} cells={[a,b,c]} widths={[1.5,0.7,3.3]} />)}
        <Divider />
        <Text style={s.h2}>Топ-3 источника для нейросетей</Text>
        <NumItem n={1} title="Профессиональные площадки" body="Хабр, vc.ru, tproger — цитируются в 61% ответов ChatGPT и Claude" />
        <NumItem n={2} title="Отраслевые каталоги и рейтинги" body="Упоминаются в 48% ответов" />
        <NumItem n={3} title="Яндекс.Справочник и Google My Business" body="44% ответов, особенно YandexGPT и Алиса" />
        <View style={{ ...s.highlight, borderLeft:`3pt solid ${C.lime}` }}>
          <Text style={{ ...s.body, marginBottom:0 }}>Нейросети рекомендуют на основе того, что о вас написали другие. Корпоративный сайт упоминается прямо лишь в 19% случаев.</Text>
        </View>
        <Footer page={4} total={T} />
      </Page>

      {/* Отрасли */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>— ОТРАСЛИ</Text>
        <Text style={s.h1}>Отраслевой рейтинг GEO-видимости</Text>
        <TR cells={["Ниша","Медиана","Топ-25%","Причина"]} widths={[2,0.7,0.7,3.1]} bold />
        {[["IT / SaaS","19%","38%+","Много обзоров, Product Hunt, Хабр"],["Консалтинг","14%","31%+","Контент-маркетинг, личные бренды"],["Образование","12%","28%+","Обзоры курсов, рейтинги платформ"],["Производство B2B","7%","18%+","Мало публичного контента"],["Розница","5%","14%+","Конкуренция с маркетплейсами"],["Недвижимость","4%","12%+","Локальный рынок слабо представлен"],["HoReCa","3%","9%+","Нейросети плохо знают локальный общепит"]].map(([a,b,c,d])=><TR key={a} cells={[a,b,c,d]} widths={[2,0.7,0.7,3.1]} />)}
        <View style={{ ...s.highlight, marginTop:16, borderLeft:`3pt solid ${C.lime}` }}>
          <Text style={s.h3}>Главный вывод</Text>
          <Text style={{ ...s.body, marginBottom:0 }}>В IT — культура публичного контента. В производстве и недвижимости — белое пятно, которое можно занять первым.</Text>
        </View>
        <Footer page={5} total={T} />
      </Page>

      {/* Лидеры */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>— ЛИДЕРЫ РЫНКА</Text>
        <Text style={s.h1}>5 общих черт брендов с GEO 30%+</Text>
        <View style={{ marginTop:12 }}>
          <NumItem n={1} title="Присутствие на авторитетных площадках" body="У 91% лидеров — минимум 2 публикации на Хабре, vc.ru или отраслевых порталах за 12 месяцев. Экспертные, не рекламные." />
          <NumItem n={2} title="Структурированные данные на сайте" body="82% лидеров используют Schema.org (Organization, Product, FAQ). Прямо влияет на Google AIO и описание в нейросетях." />
          <NumItem n={3} title="Отзывы на профильных платформах" body="78% лидеров имеют 20+ отзывов на Яндекс.Картах и Google Maps. GigaChat и YandexGPT активно используют эти данные." />
          <NumItem n={4} title="Wikipedia или независимый рейтинг" body="64% лидеров упомянуты в Wikipedia или авторитетном рейтинге. Один из самых весомых сигналов для LLM." />
          <NumItem n={5} title="Последовательное позиционирование" body="У 100% лидеров — чёткое описание специализации везде. Противоречия снижают уверенность модели в рекомендации." />
        </View>
        <Footer page={6} total={T} />
      </Page>

      {/* Причины */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>— ПРИЧИНЫ НИЗКОЙ ВИДИМОСТИ</Text>
        <Text style={s.h1}>Топ-5 ошибок (80%+ аудитов)</Text>
        {[
          {title:"Нет экспертного контента на авторитетных площадках",pct:"84%",color:C.danger,body:"Нет публикаций на Хабре, vc.ru или отраслевых порталах. Решение: 1–2 экспертные статьи."},
          {title:"Яндекс-монопрезентность",pct:"71%",color:C.danger,body:"Хорошо в Яндекс-экосистеме, невидима в Claude и Perplexity. Решение: внешние публикации."},
          {title:"Нет позиции по запросам ниши",pct:"68%",color:C.warn,body:"Много контента, но не в формате AI-запросов. Решение: FAQ, сравнения, рейтинги."},
          {title:"Противоречивые описания",pct:"52%",color:C.warn,body:"Разное позиционирование в разных источниках. Решение: «золотое описание» — 2–3 предложения — везде."},
          {title:"Нет в отраслевых агрегаторах",pct:"49%",color:C.ink3,body:"Нет в каталогах и рейтингах, которые LLM цитируют. Решение: добавить в 5–7 агрегаторов."},
        ].map(({title,pct,color,body})=>(
          <View key={title} style={{ flexDirection:"row", marginBottom:10, alignItems:"flex-start" }}>
            <View style={{ ...s.limeBar, backgroundColor:color }} />
            <View style={{ flex:1 }}>
              <View style={{ flexDirection:"row", alignItems:"center", marginBottom:2 }}>
                <Text style={{ ...s.h3, marginBottom:0, flex:1 }}>{title}</Text>
                <View style={{ ...s.badge, backgroundColor:color+"22" }}>
                  <Text style={{ ...s.badgeText, color }}>{pct}</Text>
                </View>
              </View>
              <Text style={s.small}>{body}</Text>
            </View>
          </View>
        ))}
        <Footer page={7} total={T} />
      </Page>

      {/* Сравнение + Прогноз */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>— СРАВНЕНИЕ</Text>
        <Text style={s.h1}>Россия vs Глобальный рынок</Text>
        <TR cells={["Параметр","Россия","Глобально"]} widths={[2.5,1.5,1.5]} bold />
        {[["Доминирующая платформа","Яндекс + ChatGPT","ChatGPT + Gemini"],["Локальных LLM","3 (YandexGPT, GigaChat, Алиса)","0–1"],["Медианная GEO-видимость","8%","~11%"],["Топ-причина","Яндекс-монопрезентность","Мало внешних ссылок"],["Основной источник","Хабр, vc.ru, Яндекс.Справочник","Reddit, G2, Wikipedia"]].map(([a,b,c])=><TR key={a} cells={[a,b,c]} widths={[2.5,1.5,1.5]} />)}
        <Divider />
        <Text style={s.eyebrow}>— ПРОГНОЗ</Text>
        <Text style={s.h2}>Три тренда до конца 2026</Text>
        <NumItem n={1} title="Персонализация AI-рекомендаций" body="Нейросети учитывают геолокацию и контекст. Бренды, закрепившиеся сейчас, получат долгосрочное преимущество." />
        <NumItem n={2} title="Рост Perplexity в России" body="Русскоязычная поддержка с 2026-го. Молодые профессионалы переключаются. Нужны публикации на форумах." />
        <NumItem n={3} title="Google AI Overviews в РФ-выдаче" body="Schema-разметка + авторитетные ссылки дадут двойной эффект: Google AIO + Gemini." />
        <View style={{ ...s.highlight, borderLeft:`3pt solid ${C.lime}` }}>
          <Text style={{ ...s.body, marginBottom:0 }}>Медиана — 8%. Большинство брендов ещё не занимаются GEO. Первые, кто займёт позиции сейчас, закрепятся надолго.</Text>
        </View>
        <Footer page={8} total={T} />
      </Page>

      {/* Чеклист */}
      <Page size="A4" style={s.page}>
        <Text style={s.eyebrow}>— ДЕЙСТВИЯ</Text>
        <Text style={s.h1}>Чеклист: первые 30 дней</Text>
        <Text style={s.h2}>Неделя 1 — Диагностика</Text>
        <CheckItem text="Запустить GEO-аудит на kaligeo.ru (есть бесплатный быстрый чек)" />
        <CheckItem text="Проверить вручную: 5 ключевых запросов ниши в ChatGPT, Алисе и Perplexity" />
        <CheckItem text="Записать, какие конкуренты упоминаются и в каком контексте" />
        <Text style={s.h2}>Неделя 2 — Быстрые победы</Text>
        <CheckItem text="Унифицировать описание: сайт, Яндекс.Справочник, Google My Business, соцсети" />
        <CheckItem text="Добавить Schema.org-разметку (Organization, LocalBusiness)" />
        <CheckItem text="Собрать 5–10 новых отзывов на Яндекс.Картах и Google" />
        <Text style={s.h2}>Неделя 3–4 — Контент</Text>
        <CheckItem text="Написать экспертную статью на Хабре или vc.ru (не рекламную)" />
        <CheckItem text="Добавить компанию в 3–5 отраслевых каталогов" />
        <CheckItem text="Добавить FAQ по 10 ключевым вопросам ниши с Schema-разметкой на сайт" />
        <View style={{ ...s.highlight, marginTop:12, borderLeft:`3pt solid ${C.success}` }}>
          <Text style={s.h3}>Результат через 30 дней</Text>
          <Text style={{ ...s.body, marginBottom:0 }}>По данным 47 повторных аудитов: +5–8 п.п. к медианной GEO-видимости через 4–6 недель после внедрения.</Text>
        </View>
        <Footer page={9} total={T} />
      </Page>

      {/* CTA */}
      <Page size="A4" style={{ ...s.cover, justifyContent:"center" }}>
        <Text style={s.coverEyebrow}>— СЛЕДУЮЩИЙ ШАГ</Text>
        <Text style={{ ...s.coverTitle, fontSize:30, marginTop:16 }}>{"Узнайте, как нейросети\nвидят ваш бренд"}</Text>
        <Text style={{ ...s.coverSub, marginTop:16 }}>Бесплатный быстрый чек: 3 платформы, базовые метрики — без регистрации, 2 минуты.</Text>
        <Text style={{ ...s.coverSub, marginTop:6 }}>Полный аудит: 9 платформ, конкурентная матрица, причинный анализ, Action Plan 30/60/90 дней.</Text>
        <View style={{ marginTop:40, flexDirection:"row", alignItems:"center" }}>
          <View style={{ backgroundColor:C.lime, borderRadius:6, paddingHorizontal:20, paddingVertical:12, marginRight:16 }}>
            <Text style={{ fontFamily:"Helvetica-Bold", fontSize:13, color:C.limeInk }}>kaligeo.ru →</Text>
          </View>
          <Text style={{ fontFamily:"Helvetica", fontSize:11, color:C.ink3 }}>Разовая оплата. Без подписки.</Text>
        </View>
        <View style={{ position:"absolute", bottom:40, left:52, right:52 }}>
          <Text style={{ fontFamily:"Helvetica", fontSize:8, color:C.ink3 }}>
            Исследование KaliGEO · kaligeo.ru · Август 2026 · Данные анонимизированы · Распространение разрешено со ссылкой на источник
          </Text>
        </View>
      </Page>

    </Document>
  )
}
