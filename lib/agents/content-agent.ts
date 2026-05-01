import Anthropic from "@anthropic-ai/sdk"

export interface ContentRecommendations {
  blogTopics: { title: string; angle: string; keywords: string[] }[]
  faqStructure: { question: string; answerOutline: string }[]
  schemaSuggestions: { type: string; description: string }[]
  contentBriefs: { title: string; goal: string; format: string }[]
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function runContentAgent(params: {
  companyName: string
  niche: string
  weakPoints: string[]
  competitorStrengths: string[]
}): Promise<ContentRecommendations> {
  const { companyName, niche, weakPoints, competitorStrengths } = params

  const prompt = `Ты — эксперт по контент-маркетингу для улучшения видимости в AI-поисковых системах (ChatGPT, Perplexity, Gemini и др.).

Компания: ${companyName}
Ниша: ${niche}

Слабые места (из AI-аудита):
${weakPoints.map((w) => `- ${w}`).join("\n")}

Сильные стороны конкурентов:
${competitorStrengths.map((s) => `- ${s}`).join("\n")}

Создай конкретные контентные рекомендации для улучшения AI-видимости.

Верни JSON строго в формате:
{
  "blogTopics": [{"title": "...", "angle": "...", "keywords": ["..."]}],
  "faqStructure": [{"question": "...", "answerOutline": "..."}],
  "schemaSuggestions": [{"type": "...", "description": "..."}],
  "contentBriefs": [{"title": "...", "goal": "...", "format": "..."}]
}

Правила:
- blogTopics: 5-7 тем, фокус на вопросах которые задают AI
- faqStructure: 5-8 FAQ, которые AI цитирует в ответах
- schemaSuggestions: 3-4 типа Schema.org разметки для лучшего entity recognition
- contentBriefs: 3-5 контент-брифа (лонгрид/кейс/сравнение)
- Всё на русском языке`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Failed to parse content recommendations JSON")

  return JSON.parse(jsonMatch[0]) as ContentRecommendations
}
