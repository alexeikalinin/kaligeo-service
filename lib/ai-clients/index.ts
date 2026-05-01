import { openaiClient } from "./openai"
import { anthropicClient } from "./anthropic"
import { geminiClient } from "./gemini"
import { perplexityClient } from "./perplexity"
import { deepseekClient } from "./deepseek"
import { yandexgptClient } from "./yandexgpt"
import { gigachatClient } from "./gigachat"
import { alisaClient } from "./alisa"
import type { AIClient } from "./types"

export const AI_CLIENTS: Record<string, AIClient> = {
  CHATGPT: openaiClient,
  CLAUDE: anthropicClient,
  GEMINI: geminiClient,
  PERPLEXITY: perplexityClient,
  DEEPSEEK: deepseekClient,
  YANDEXGPT: yandexgptClient,
  GIGACHAT: gigachatClient,
  ALISA: alisaClient,
}

export const ACTIVE_PLATFORMS = Object.keys(AI_CLIENTS)

export type { AIClient }
export { AUDIT_SYSTEM_PROMPT } from "./types"
