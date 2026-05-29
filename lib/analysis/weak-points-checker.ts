import type { QueryResult } from "@prisma/client"
import { calculateShareOfVoice } from "./share-of-voice"
import { calculateCompetitivePosition } from "./competitive-positioning"
import type { PlatformScore } from "./calculate-scores"

export interface WeakPoint {
  id: string
  title: string
  description: string
  severity: "high" | "medium" | "low"
  detected: boolean
}

export function detectWeakPoints(
  results: QueryResult[],
  websiteUrl: string,
  overallScore: number,
  competitors?: string[],
  platformScores?: Record<string, PlatformScore>
): WeakPoint[] {
  const domain = websiteUrl.replace("https://", "").replace("http://", "").split("/")[0]

  // SoV и позиционирование (если есть конкуренты)
  const compList = competitors ?? []
  const sov = compList.length > 0 ? calculateShareOfVoice(results, "", compList) : null
  const positioning = compList.length >= 2 ? calculateCompetitivePosition(results, compList) : null

  const mentionedInSources = results.filter((r) => {
    const sources = r.sources as string[]
    return sources.some((s) => s.includes(domain))
  }).length

  const brandMentionRate = results.filter((r) => r.brandMentioned).length / Math.max(results.length, 1)
  const negativeSentiments = results.filter((r) => r.sentiment === "negative").length

  // Позиционные запросы: "топ", "лучший", "первый", "рейтинг", "рекомендуй" — ключевые для GEO Authority
  const positionQueries = results.filter((r) =>
    /топ|лучш|первый|рейтинг|рекоменд|best|top|leader|recommend/i.test(r.query)
  )
  const mentionedInPositionQueries = positionQueries.filter((r) => r.brandMentioned).length
  const positionMentionRate = positionQueries.length > 0
    ? mentionedInPositionQueries / positionQueries.length
    : brandMentionRate

  // Сравнительные запросы: "vs", "или", "сравн", "лучше" — важны для Comparison-страниц
  const comparisonQueries = results.filter((r) =>
    /\bvs\b|или|сравн|лучше|против|compare|versus/i.test(r.query)
  )
  const mentionedInComparisonQueries = comparisonQueries.filter((r) => r.brandMentioned).length
  const comparisonMentionRate = comparisonQueries.length > 0
    ? mentionedInComparisonQueries / comparisonQueries.length
    : 1 // нет comparison-запросов — не флагируем

  // positionScore из схемы (Фаза 3) — если есть данные, используем
  type ResultWithPos = QueryResult & { positionScore: number }
  const positionScores = results
    .filter((r) => r.brandMentioned && (r as ResultWithPos).positionScore > 0)
    .map((r) => (r as ResultWithPos).positionScore)
  const avgPositionScore = positionScores.length > 0
    ? positionScores.reduce((a, b) => a + b, 0) / positionScores.length
    : 0
  const hasPositionData = positionScores.length >= 3

  return ([
    {
      id: "low-visibility",
      title: "Низкая AI-видимость",
      description: `Бренд упоминается только в ${Math.round(brandMentionRate * 100)}% ответов. Целевой показатель — 40%+`,
      severity: "high",
      detected: brandMentionRate < 0.2,
    },
    {
      id: "no-source-citations",
      title: "Отсутствие ссылок на сайт",
      description: "AI-поисковики не цитируют ваш сайт как источник. Нужны авторитетные материалы и Schema разметка.",
      severity: "high",
      detected: mentionedInSources < 3,
    },
    // GEO 2026: Position gap — не попадает в топ-рекомендации
    {
      id: "not-first-in-recommendations",
      title: "Не попадает в топ-рекомендации",
      description: `В запросах "топ", "лучший", "рейтинг" бренд упоминается только в ${Math.round(positionMentionRate * 100)}% случаев. ИИ не считает вас primary recommendation. Нужны GEO Authority сигналы и контент формата "Лучший X для Y".`,
      severity: "high",
      detected: positionQueries.length >= 3 && positionMentionRate < 0.25,
    },
    {
      id: "negative-sentiment",
      title: "Негативные упоминания",
      description: `Обнаружено ${negativeSentiments} ответов с негативным контекстом. Проверьте отзывы и репутацию.`,
      severity: "medium",
      detected: negativeSentiments > 0,
    },
    {
      id: "low-score",
      title: "Общий низкий рейтинг видимости",
      description: `Общий score ${overallScore}/100. Требуется комплексная работа с AI-присутствием.`,
      severity: "medium",
      detected: overallScore < 30,
    },
    {
      id: "missing-schema",
      title: "Отсутствие Schema.org разметки",
      description: "Без структурированных данных AI сложнее идентифицировать ваш бизнес как авторитетный источник.",
      severity: "medium",
      detected: true, // always flag — проверяется при реализации
    },
    // GEO 2026: Position score — упоминается поздно в ответе
    {
      id: "low-position-score",
      title: "Слабая позиция в ответе",
      description: `Бренд упоминается преимущественно в середине или конце AI-ответов (средняя позиция ${avgPositionScore.toFixed(1)}/4). Первое упоминание получает в 3-5x больше внимания. Нужен контент, который ИИ использует как primary source.`,
      severity: "medium",
      detected: hasPositionData && avgPositionScore > 2.5,
    },
    // GEO 2026: Comparison gap — не включают в сравнения
    {
      id: "missing-comparison-presence",
      title: "Отсутствие в сравнительных запросах",
      description: `В запросах "X vs Y" и "сравнение [ниша]" бренд упоминается в ${Math.round(comparisonMentionRate * 100)}% случаев. ИИ не включает вас в сравнения конкурентов — нужны Comparison-страницы и присутствие в отраслевых рейтингах.`,
      severity: "medium",
      detected: comparisonQueries.length >= 2 && comparisonMentionRate < 0.3,
    },
    {
      id: "few-reviews",
      title: "Недостаточно отзывов",
      description: "Отзывы на Google, Яндекс, 2GIS напрямую влияют на то, рекомендует ли AI ваш бизнес.",
      severity: "low",
      detected: overallScore < 50,
    },
    {
      id: "entity-signals",
      title: "Слабые entity signals",
      description: "Ваш бренд плохо представлен в Wikipedia, Wikidata или отраслевых справочниках, которые AI использует как источник.",
      severity: "low",
      detected: brandMentionRate < 0.15,
    },

    // ── Алиса-специфичные слабые места ────────────────────────────────────────
    ...((): WeakPoint[] => {
      const alisaScore = platformScores?.["Alisa"]?.score ?? platformScores?.["alisa"]?.score ?? null
      if (alisaScore === null) return []

      const alisaWeakPoints: WeakPoint[] = [
        {
          id: "alisa-no-yandex-business",
          title: "Не зарегистрированы в Яндекс Бизнес",
          description:
            "Алиса использует Яндекс Бизнес (Справочник) как основной источник для рекомендаций местных компаний и услуг. Без карточки — вас нет в голосовых ответах на локальные запросы. Зарегистрируйтесь на business.yandex.ru и заполните все поля: описание, часы работы, категории, фото.",
          severity: "high",
          detected: alisaScore < 30,
        },
        {
          id: "alisa-no-speakable-schema",
          title: "Нет Speakable разметки для голосовых ответов",
          description:
            "Schema.org Speakable — единственный тип разметки, созданный специально для голосовых ассистентов. Он указывает Алисе, какие фрагменты страницы зачитывать вслух. Добавьте speakableSpecification с cssSelector для ключевых абзацев (H1, первый абзац описания, FAQ-ответы).",
          severity: "medium",
          detected: alisaScore < 50,
        },
        {
          id: "alisa-possible-bot-block",
          title: "Возможна блокировка YandexAdditionalBot",
          description:
            "AI-видимость в Алисе равна нулю. Вероятная причина — YandexAdditionalBot заблокирован в robots.txt. Это краулер, который Алиса использует для чтения контента. Проверьте robots.txt: уберите запрет для User-agent: YandexAdditionalBot. Изменения вступят в силу через 2–14 дней.",
          severity: "high",
          detected: alisaScore === 0,
        },
      ]
      return alisaWeakPoints.filter((wp) => wp.detected)
    })(),

    // ── Покрытие типов запросов (фреймворк 5 типов) ───────────────────────────
    ...((): WeakPoint[] => {
      if (results.length < 5) return []

      // Категорийные: "лучший", "топ", "рейтинг", "рекоменд"
      const categoryQ = results.filter((r) => /лучш|топ|рейтинг|рекоменд|best|top|leader/i.test(r.query))
      // Коммерческие: "цена", "стоимость", "купить", "заказать", "тариф"
      const commercialQ = results.filter((r) => /цен|стоимость|купить|заказать|тариф|сколько стоит|price|buy|order/i.test(r.query))
      // Проблемные: "как", "почему", "что делать", "помогите", "решение"
      const problemQ = results.filter((r) => /^как |почему|что делать|помогите|решени|проблем|how to|why /i.test(r.query))
      // Сравнительные: уже есть comparisonQueries выше
      // Брендовые: содержат название домена или компании
      const brandedQ = results.filter((r) => r.query.toLowerCase().includes(websiteUrl.replace("https://", "").split("/")[0].toLowerCase()))

      const missedTypes: string[] = []
      if (categoryQ.length === 0) missedTypes.push("категорийные («лучший X», «топ сервисов»)")
      if (commercialQ.length === 0) missedTypes.push("коммерческие («цена», «заказать»)")
      if (problemQ.length === 0) missedTypes.push("проблемные («как сделать X», «решение проблемы»)")

      if (missedTypes.length === 0) return []
      const coverageWp: WeakPoint = {
        id: "query-type-coverage-gap",
        title: "Не все типы запросов охвачены",
        description: `В аудите не проверялись: ${missedTypes.join(", ")}. Профессиональный GEO-аудит охватывает 5 типов: категорийные, коммерческие, проблемные, сравнительные и брендовые. AI-видимость может сильно отличаться по каждому типу.`,
        severity: "low",
        detected: true,
      }
      return [coverageWp]
    })(),

    // ── Платформо-специфичные слабые места (кроме Алисы — она выше) ──────────
    ...((): WeakPoint[] => {
      if (!platformScores) return []
      const wps: WeakPoint[] = []

      // ── ChatGPT ─────────────────────────────────────────────────────────────
      const chatgptScore = platformScores["ChatGPT"]?.score ?? platformScores["CHATGPT"]?.score ?? null
      if (chatgptScore !== null) {
        if (chatgptScore < 35) {
          wps.push({
            id: "chatgpt-no-wikipedia",
            title: "Нет в Wikipedia — главном источнике ChatGPT",
            description:
              "Wikipedia составляет 40–48% всех цитирований ChatGPT. Без страницы на Wikipedia ChatGPT не считает бренд авторитетной сущностью. Создайте/обновите статью на ru.wikipedia.org и Wikidata с ключевыми фактами о компании.",
            severity: "high",
            detected: true,
          })
        }
        if (chatgptScore < 50) {
          wps.push({
            id: "chatgpt-low-fact-density",
            title: "Низкая фактическая насыщенность контента",
            description:
              "ChatGPT цитирует контент с высокой fact density — статистикой, определениями, пошаговыми инструкциями — на 40% чаще, чем общие тексты. Добавьте конкретные цифры, даты и экспертные утверждения в ключевые страницы.",
            severity: "medium",
            detected: true,
          })
        }
      }

      // ── Perplexity ───────────────────────────────────────────────────────────
      const perplexityScore = platformScores["Perplexity"]?.score ?? platformScores["PERPLEXITY"]?.score ?? null
      if (perplexityScore !== null) {
        if (perplexityScore < 40) {
          wps.push({
            id: "perplexity-no-reddit",
            title: "Нет присутствия на Reddit — 47% источников Perplexity",
            description:
              "Perplexity цитирует Reddit в 46.7% ответов — это его главный источник. Бренды с активными обсуждениями на Reddit получают на 40% больше цитирований. Создайте экспертные треды на r/[ваша_ниша], участвуйте в обсуждениях.",
            severity: "high",
            detected: true,
          })
        }
        if (perplexityScore < 55) {
          wps.push({
            id: "perplexity-no-quotable-blocks",
            title: "Контент не оптимизирован под цитирование Perplexity",
            description:
              "Perplexity вырезает конкретные фрагменты 40–60 слов из страниц. Плотные абзацы не цитируются — разбейте контент на Q&A-блоки с прямыми ответами, используйте H2 в формате вопроса «Как...?» или «Почему...?».",
            severity: "medium",
            detected: true,
          })
        }
      }

      // ── Gemini ───────────────────────────────────────────────────────────────
      const geminiScore = platformScores["Gemini"]?.score ?? platformScores["GEMINI"]?.score ?? null
      if (geminiScore !== null) {
        if (geminiScore < 40) {
          wps.push({
            id: "gemini-no-youtube",
            title: "Нет видеоконтента — YouTube главный источник Gemini",
            description:
              "YouTube входит в топ-3 цитируемых источников Gemini для большинства тематик. Бренды с видео на YouTube получают значительно больше упоминаний в Gemini. Создайте канал с транскрибированными видео, чёткими главами и описаниями.",
            severity: "high",
            detected: true,
          })
        }
        if (geminiScore < 50) {
          wps.push({
            id: "gemini-no-google-business",
            title: "Нет Google Business Profile для Gemini",
            description:
              "Gemini интегрирует Google Business Profile для локальных рекомендаций. Без актуальной карточки (NAP, отзывы, часы работы) Gemini не включает компанию в локальные ответы. Обновите профиль на business.google.com.",
            severity: "medium",
            detected: true,
          })
        }
      }

      // ── Claude (Anthropic) ───────────────────────────────────────────────────
      const claudeScore = platformScores["Claude"]?.score ?? platformScores["CLAUDE"]?.score ?? null
      if (claudeScore !== null) {
        if (claudeScore < 35) {
          wps.push({
            id: "claude-brave-search-gap",
            title: "Низкая видимость в Brave Search — воротах для Claude",
            description:
              "86.7% URL-источников Claude совпадают с топом Brave Search. Claude фактически использует Brave как поисковый движок. Проверьте индексацию в Brave Search (search.brave.com) и оптимизируйте под его алгоритм.",
            severity: "high",
            detected: true,
          })
        }
        if (claudeScore < 50) {
          wps.push({
            id: "claude-no-author-credentials",
            title: "Нет авторских credentials — Claude цитирует экспертов",
            description:
              "63% цитируемых Claude источников — нишевые блоги и статьи практиков. Claude отдаёт предпочтение контенту с visible author bio: имя, должность, опыт. Добавьте профиль автора со ссылками на LinkedIn/Wikidata и JSON-LD Person schema.",
            severity: "medium",
            detected: true,
          })
        }
      }

      // ── Grok (xAI) ───────────────────────────────────────────────────────────
      const grokScore = platformScores["Grok"]?.score ?? platformScores["GROK"]?.score ?? null
      if (grokScore !== null) {
        if (grokScore < 40) {
          wps.push({
            id: "grok-no-x-twitter-presence",
            title: "Нет присутствия на X (Twitter) — уникальный сигнал Grok",
            description:
              "Grok — единственный AI, который использует данные X/Twitter в реальном времени наряду с веб-поиском. Активное присутствие бренда на X (публикации по теме, упоминания, engagement) напрямую влияет на видимость в Grok.",
            severity: "high",
            detected: true,
          })
        }
        if (grokScore === 0) {
          wps.push({
            id: "grok-xai-bot-blocked",
            title: "Возможна блокировка xAI-краулера",
            description:
              "Grok не может цитировать сайты, которые блокируют его краулер. Проверьте robots.txt — убедитесь, что User-agent: xAI не заблокирован. Добавьте Allow: / для xAI.",
            severity: "high",
            detected: true,
          })
        }
      }

      // ── DeepSeek ─────────────────────────────────────────────────────────────
      const deepseekScore = platformScores["DeepSeek"]?.score ?? platformScores["DEEPSEEK"]?.score ?? null
      if (deepseekScore !== null && deepseekScore < 30) {
        wps.push({
          id: "deepseek-no-platform-strategy",
          title: "DeepSeek требует отдельной стратегии",
          description:
            "DeepSeek (130M пользователей, 4% рынка AI) использует собственный поисковый движок с параметрами, отличными от ChatGPT. Аудитория DeepSeek географически и демографически отличается. Нужна отдельная контентная стратегия под его алгоритм.",
          severity: "medium",
          detected: true,
        })
      }

      // ── GigaChat (Сбер) ──────────────────────────────────────────────────────
      const gigachatScore = platformScores["GigaChat"]?.score ?? platformScores["GIGACHAT"]?.score ?? null
      if (gigachatScore !== null) {
        if (gigachatScore < 35) {
          wps.push({
            id: "gigachat-no-business-media",
            title: "Нет упоминаний в деловых СМИ для GigaChat",
            description:
              "GigaChat (35M+ пользователей) обучен на русскоязычном деловом контенте и использует GigaSearch. Приоритет отдаётся публикациям в РБК, Ведомостях, Коммерсанте, Форбс. Разместите пресс-релизы и экспертные комментарии в деловых изданиях.",
            severity: "high",
            detected: true,
          })
        }
        if (gigachatScore < 50) {
          wps.push({
            id: "gigachat-yandex-signals-dont-transfer",
            title: "Сигналы Яндекс-экосистемы не влияют на GigaChat",
            description:
              "Распространённая ошибка: оптимизировать под Яндекс и считать, что это поможет GigaChat. Алиса и GigaChat — разные системы с разными обучающими данными. Яндекс Бизнес не влияет на GigaChat. Нужна отдельная стратегия через Сбер-экосистему.",
            severity: "medium",
            detected: true,
          })
        }
      }

      // ── YandexGPT ────────────────────────────────────────────────────────────
      const yandexScore = platformScores["YandexGPT"]?.score ?? platformScores["YANDEXGPT"]?.score ?? null
      if (yandexScore !== null && yandexScore < 35) {
        wps.push({
          id: "yandexgpt-no-zen-dzen",
          title: "Нет контента в Яндекс Дзен / Кью",
          description:
            "YandexGPT активно использует контент из экосистемы Яндекса: Дзен, Кью (Q&A), Яндекс Новости. Экспертные статьи на Дзен и ответы на Кью напрямую попадают в обучающую базу YandexGPT и его RAG-систему.",
          severity: "medium",
          detected: true,
        })
      }

      return wps
    })(),

    // ── Entity Recognition по платформам ──────────────────────────────────────
    ...((): WeakPoint[] => {
      if (!platformScores) return []
      const wps: WeakPoint[] = []

      for (const [platform, ps] of Object.entries(platformScores)) {
        // Пропускаем платформы с малым числом запросов
        if (ps.totalQueries < 3) continue

        const platformMentionRate = ps.mentionCount / Math.max(ps.totalQueries, 1)
        const platformResults = results.filter(
          (r) => r.platform === platform || r.platform === platform.toUpperCase() || r.platform === platform.toLowerCase()
        )
        const hasNegativeSentiment = platformResults.some((r) => r.sentiment === "negative")
        const platformLabel = platform

        if (platformMentionRate === 0) {
          wps.push({
            id: `entity-unrecognized-${platform.toLowerCase()}`,
            title: `${platformLabel}: бренд не распознан`,
            description: `${platformLabel} не упомянул бренд ни в одном из ${ps.totalQueries} запросов — отсутствие Entity Recognition. Платформа не знает, что этот бренд существует. Необходимо создать присутствие в источниках, которые ${platformLabel} использует для обучения и поиска.`,
            severity: "high",
            detected: true,
          })
        } else if (platformMentionRate > 0 && platformMentionRate < 0.1) {
          wps.push({
            id: `entity-partial-${platform.toLowerCase()}`,
            title: `${platformLabel}: частичное распознавание бренда`,
            description: `${platformLabel} упоминает бренд только в ${Math.round(platformMentionRate * 100)}% запросов — неполное Entity Recognition. Платформа «слышала» о бренде, но не считает его достаточно авторитетным для регулярных упоминаний.`,
            severity: "medium",
            detected: true,
          })
        } else if (hasNegativeSentiment && platformMentionRate > 0.3) {
          wps.push({
            id: `entity-confused-${platform.toLowerCase()}`,
            title: `${platformLabel}: неверный контекст упоминания`,
            description: `${platformLabel} упоминает бренд с негативным контекстом — возможно, путает с другой компанией или воспроизводит устаревшую информацию. Добавьте disambiguation-блок на сайте: «[Бренд] (не путать с [похожее]) — это...».`,
            severity: "high",
            detected: true,
          })
        }
      }

      return wps
    })(),

    // ── SoV & Positioning ─────────────────────────────────────────────────────
    {
      id: "sov-below-20",
      title: "Проигрываете конкурентам по доле упоминаний",
      description: `Share of Voice бренда: ${sov?.overall ?? 0}%. Конкуренты упоминаются в AI-ответах чаще. Увеличьте контентное присутствие и авторитет источников.`,
      severity: "high",
      detected: sov !== null && sov.overall < 20,
    },
    {
      id: "not-ranked-first",
      title: "Редко упоминаетесь первым",
      description: `Первое место в ответе AI получаете только в ${positioning?.firstMentionRate ?? 0}% запросов. Первое упоминание получает в 3–5× больше внимания — нужен контент формата primary recommendation.`,
      severity: "medium",
      detected: positioning !== null && positioning.firstMentionRate < 30,
    },
    {
      id: "competitive-position-weak",
      title: "Слабые конкурентные позиции",
      description: `По частоте упоминаний в AI вы занимаете ${positioning?.rank ?? "?"} место из ${positioning?.totalParticipants ?? "?"}. Конкуренты системно опережают вас в ответах нейросетей.`,
      severity: "high",
      detected: positioning !== null && positioning.rank > 2 && positioning.totalParticipants >= 3,
    },
  ] as const).map(wp => ({ ...wp, severity: wp.severity as WeakPoint["severity"] })).filter((wp) => wp.detected)
}
