import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface WebsiteFix {
  type: "meta" | "content" | "structured-data" | "faq" | "about" | "home"
  page: string
  title: string
  description: string
  code: string
}

export interface WebsiteFixResult {
  summary: string
  fixes: WebsiteFix[]
  estimatedImpact: string
  generatedAt: string
}

export interface WebsiteFixInput {
  companyName: string
  niche: string
  websiteUrl: string
  overallScore: number
  weakPoints: unknown
  actionPlan: unknown
  visibilityScores: unknown
  competitors: string[]
}

const SYSTEM_PROMPT = `Ты эксперт по LLM-оптимизации сайтов. Твоя задача — помочь компаниям стать более видимыми в ответах ChatGPT, Claude, Gemini, Perplexity и других LLM.

LLM-видимость зависит от:
1. Структурированного контента — LLM лучше читают четкие факты, Q&A, списки
2. Семантической плотности — ключевые термины ниши должны быть в тексте
3. E-E-A-T сигналов — экспертность, авторитетность, достоверность
4. JSON-LD разметки — помогает понять контекст компании
5. FAQ секций — LLM часто генерируют ответы из FAQ-подобного контента

Возвращай конкретный HTML/JSON-LD код, который клиент может скопировать и внедрить.`

export async function runWebsiteFixAgent(
  input: WebsiteFixInput
): Promise<WebsiteFixResult> {
  const weakPointsText = JSON.stringify(input.weakPoints, null, 2)
  const actionPlanText = JSON.stringify(input.actionPlan, null, 2)
  const scoresText = JSON.stringify(input.visibilityScores, null, 2)

  const prompt = `Компания: ${input.companyName}
Сайт: ${input.websiteUrl}
Ниша: ${input.niche}
Конкуренты: ${input.competitors.join(", ")}
Общий score видимости: ${input.overallScore}/100

Слабые места из аудита:
${weakPointsText}

План действий из аудита:
${actionPlanText}

Видимость по платформам:
${scoresText}

---

Сгенерируй конкретные правки для сайта, которые улучшат видимость в LLM. Верни ТОЛЬКО валидный JSON без markdown-блоков:

{
  "summary": "краткое описание что и зачем меняем (2-3 предложения)",
  "estimatedImpact": "ожидаемый прирост score через 4-8 недель (например +15-25 пунктов)",
  "fixes": [
    {
      "type": "structured-data",
      "page": "/",
      "title": "JSON-LD разметка Organization",
      "description": "Добавляет структурированные данные об организации, которые LLM используют для идентификации компании",
      "code": "<script type=\\"application/ld+json\\">\\n{\\n  \\"@context\\": \\"https://schema.org\\",\\n  \\"@type\\": \\"Organization\\",\\n  ...\\n}\\n</script>"
    },
    {
      "type": "meta",
      "page": "/",
      "title": "Мета-теги главной страницы",
      "description": "Оптимизированные title и description с ключевыми терминами ниши",
      "code": "<title>...</title>\\n<meta name=\\"description\\" content=\\"...\\" />"
    },
    {
      "type": "faq",
      "page": "/faq",
      "title": "FAQ секция для LLM-видимости",
      "description": "Вопросы и ответы в формате, который LLM используют как источник",
      "code": "<section class=\\"faq\\">\\n  <h2>Часто задаваемые вопросы</h2>\\n  ...\\n</section>"
    },
    {
      "type": "content",
      "page": "/about",
      "title": "Текст страницы «О компании»",
      "description": "Переработанный текст с E-E-A-T сигналами и ключевыми терминами ниши",
      "code": "<h1>...</h1>\\n<p>...</p>..."
    },
    {
      "type": "home",
      "page": "/",
      "title": "Hero секция главной страницы",
      "description": "Переработанный заголовок и подзаголовок с семантически богатым описанием",
      "code": "<h1>...</h1>\\n<p>...</p>"
    }
  ]
}

Требования:
- code должен содержать реальный готовый HTML/JSON-LD, не заглушки
- Используй реальное название компании ${input.companyName} и нишу ${input.niche}
- JSON-LD должен быть корректным Schema.org
- FAQ: минимум 5 вопросов, ответы 2-4 предложения, покрывают основные запросы в нише
- Все тексты на русском языке`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : "{}"

  try {
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
    const parsed = JSON.parse(cleaned) as Omit<WebsiteFixResult, "generatedAt">
    return {
      ...parsed,
      generatedAt: new Date().toISOString(),
    }
  } catch {
    return {
      summary: "Ошибка при генерации рекомендаций",
      fixes: [],
      estimatedImpact: "—",
      generatedAt: new Date().toISOString(),
    }
  }
}
