export interface AIClient {
  name: string
  /** Проверяет наличие необходимых env-переменных. Если false — платформа пропускается в аудите. */
  isConfigured(): boolean
  query(prompt: string, systemPrompt?: string): Promise<string>
  /**
   * Опциональный метод для платформ, возвращающих структурированные citations (например Perplexity).
   * Если не реализован — execute-queries использует query() + regex-fallback.
   */
  queryWithSources?(prompt: string, systemPrompt?: string): Promise<{
    response: string
    citations: string[] // проверенные URL-источники, которые ИИ реально использовал
  }>
}

export interface QueryInput {
  query: string
  companyName: string
  websiteUrl: string
  niche: string
}

export const AUDIT_SYSTEM_PROMPT = `You are a helpful assistant answering user questions about products and services.
Answer naturally and conversationally, as you normally would.
Provide specific recommendations when asked.`
