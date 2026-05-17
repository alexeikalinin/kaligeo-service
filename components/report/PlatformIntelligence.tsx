export interface PlatformInsight {
  platform: string
  score: number
  insight: string
  topSignal: string
  yourStatus: "strong" | "average" | "weak"
  actionHint: string
}

interface PlatformIntelligenceProps {
  insights: PlatformInsight[]
}

const STATUS_COLOR: Record<PlatformInsight["yourStatus"], string> = {
  strong:  "#16a34a",
  average: "#f59e0b",
  weak:    "#ef4444",
}

const STATUS_LABEL: Record<PlatformInsight["yourStatus"], string> = {
  strong:  "Сильная позиция",
  average: "Средняя позиция",
  weak:    "Слабая позиция",
}

const PLATFORM_LABELS: Record<string, string> = {
  CHATGPT:    "ChatGPT",
  CLAUDE:     "Claude",
  GEMINI:     "Gemini",
  PERPLEXITY: "Perplexity",
  DEEPSEEK:   "DeepSeek",
  YANDEXGPT:  "YandexGPT",
  GIGACHAT:   "GigaChat",
  ALISA:      "Алиса",
}

const STATIC_PLATFORM_DATA: Record<
  string,
  { insight: string; topSignal: string; actionHint: string }
> = {
  CHATGPT: {
    insight:
      "ChatGPT опирается на данные из обучающего корпуса — Wikipedia, крупные медиа, отраслевые порталы. Важнее всего: упоминания в авторитетных источниках и Schema.org разметка.",
    topSignal: "Авторитетные упоминания",
    actionHint:
      "Добавьте JSON-LD разметку Organization + Service на главную страницу. Разместите экспертный комментарий в авторитетном отраслевом медиа.",
  },
  CLAUDE: {
    insight:
      "Claude особенно хорошо работает с хорошо структурированным контентом. FAQ-страницы и чёткие описания услуг дают прямой эффект.",
    topSignal: "Структурированный контент",
    actionHint:
      "Создайте страницу /faq с 10+ вопросами и развёрнутыми ответами. Структурируйте описания услуг в формате «что → кому → результат».",
  },
  GEMINI: {
    insight:
      "Gemini интегрирован с Google и активно использует данные Google Business Profile и сайтов с хорошей SEO-структурой.",
    topSignal: "Google Business + SEO",
    actionHint:
      "Заполните Google Business Profile полностью, включая фото, описание услуг и категории. Настройте правильную SEO-структуру страниц.",
  },
  PERPLEXITY: {
    insight:
      "Perplexity — реальный веб-поиск в реальном времени. Ссылается на конкретные страницы. Свежий контент и активные источники важнее всего.",
    topSignal: "Актуальный веб-контент",
    actionHint:
      "Публикуйте регулярные материалы (1-2 в месяц). Обеспечьте индексирование сайта — проверьте sitemap.xml и robots.txt.",
  },
  DEEPSEEK: {
    insight:
      "DeepSeek обучен преимущественно на англоязычных данных. Наличие англоязычного контента на сайте значительно повышает видимость.",
    topSignal: "Англоязычный контент",
    actionHint:
      "Добавьте минимальную англоязычную версию: About, Services, Contact. Даже краткий перевод ключевых страниц даёт значимый прирост.",
  },
  YANDEXGPT: {
    insight:
      "YandexGPT использует данные Яндекс.Справочника, 2ГИС и отечественных медиа. Присутствие в Яндекс.Бизнес — базовый сигнал.",
    topSignal: "Яндекс.Бизнес + 2ГИС",
    actionHint:
      "Создайте и полностью заполните профиль в Яндекс.Бизнес и 2ГИС. Попросите клиентов оставить отзывы — они напрямую влияют на рейтинг.",
  },
  GIGACHAT: {
    insight:
      "GigaChat обучен на отечественном корпусе — деловые медиа, Habr, vc.ru. Публикации на этих платформах дают прямой эффект.",
    topSignal: "Отечественные медиа",
    actionHint:
      "Опубликуйте статью на vc.ru или Habr о вашей экспертизе. Зарегистрируйтесь как эксперт на Habr Q&A и отвечайте на вопросы в вашей нише.",
  },
  ALISA: {
    insight:
      "Алиса опирается на YandexGPT с акцентом на локальный бизнес и геолокацию. Актуальные данные в Яндекс.Бизнес обязательны.",
    topSignal: "Яндекс.Бизнес (локация)",
    actionHint:
      "Убедитесь что адрес и телефон в Яндекс.Бизнес актуальны. Укажите точный список услуг с ценами — именно их Алиса озвучивает в ответах.",
  },
}

function getStaticData(platform: string) {
  return (
    STATIC_PLATFORM_DATA[platform] ?? {
      insight: "Алгоритм этой платформы использует смешанные сигналы для оценки авторитетности.",
      topSignal: "Смешанные сигналы",
      actionHint: "Обеспечьте консистентное присутствие в основных источниках — каталогах и медиа.",
    }
  )
}

export function PlatformIntelligence({ insights }: PlatformIntelligenceProps) {
  if (insights.length === 0) return null

  return (
    <section>
      <p className="t-eyebrow mb-1">Логика платформ</p>
      <h2
        className="text-lg font-bold mb-1"
        style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
      >
        Почему одни бренды появляются, а другие нет
      </h2>
      <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>
        Каждая AI-платформа использует разные сигналы авторитетности. Вот что важно именно для вас.
      </p>

      <div className="flex flex-col gap-3">
        {insights.map((insight) => {
          const staticData = getStaticData(insight.platform)
          const statusColor = STATUS_COLOR[insight.yourStatus]
          const insightText = insight.insight || staticData.insight
          const topSignal = insight.topSignal || staticData.topSignal
          const actionHint = insight.actionHint || staticData.actionHint

          return (
            <div
              key={insight.platform}
              className="rounded-xl overflow-hidden"
              style={{
                border: "1px solid var(--rule)",
                background: "var(--bone-2)",
                borderLeft: `4px solid ${statusColor}`,
              }}
            >
              <div className="px-5 py-4">
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3
                      className="font-bold"
                      style={{ color: "var(--ink)", fontFamily: "var(--font-serif)" }}
                    >
                      {PLATFORM_LABELS[insight.platform] ?? insight.platform}
                    </h3>
                    <span
                      className="monotag"
                      style={{
                        background: statusColor,
                        borderColor: statusColor,
                        color: "#fff",
                        fontSize: "9px",
                        padding: "2px 6px",
                      }}
                    >
                      {STATUS_LABEL[insight.yourStatus]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-2xl font-bold"
                      style={{ fontFamily: "var(--font-mono)", color: statusColor }}
                    >
                      {insight.score}
                    </span>
                    <span className="text-xs" style={{ color: "var(--ink-3)" }}>/100</span>
                  </div>
                </div>

                {/* Insight text */}
                <p className="text-sm mb-3" style={{ color: "var(--ink-2)" }}>
                  {insightText}
                </p>

                {/* Top signal */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                    Главный сигнал:
                  </span>
                  <span className="monotag">
                    ⚡ {topSignal}
                  </span>
                </div>

                {/* Action hint */}
                <div
                  className="rounded-lg px-3 py-2.5 text-xs leading-relaxed"
                  style={{
                    borderLeft: "3px solid var(--accent)",
                    background: "var(--bone)",
                    color: "var(--ink-2)",
                  }}
                >
                  <span
                    className="font-medium"
                    style={{ color: "var(--ink)", fontFamily: "var(--font-mono)", fontSize: "10px" }}
                  >
                    ЧТО СДЕЛАТЬ ·{" "}
                  </span>
                  {actionHint}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
