export interface AIClient {
  name: string
  query(prompt: string, systemPrompt?: string): Promise<string>
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
