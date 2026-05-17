import { openaiClient }     from "./openai"
import { anthropicClient }  from "./anthropic"
import { geminiClient }     from "./gemini"
import { perplexityClient } from "./perplexity"
import { deepseekClient }   from "./deepseek"
import { yandexgptClient }  from "./yandexgpt"
import { gigachatClient }   from "./gigachat"
import { alisaClient }      from "./alisa"
import type { AIClient }    from "./types"

export const AI_CLIENTS: Record<string, AIClient> = {
  CHATGPT:    openaiClient,
  CLAUDE:     anthropicClient,
  GEMINI:     geminiClient,
  PERPLEXITY: perplexityClient,
  DEEPSEEK:   deepseekClient,
  YANDEXGPT:  yandexgptClient,
  GIGACHAT:   gigachatClient,
  ALISA:      alisaClient,
}

/** Только платформы с настроенными ключами */
export function getActivePlatforms(): string[] {
  return Object.entries(AI_CLIENTS)
    .filter(([, client]) => client.isConfigured())
    .map(([key]) => key)
}

/** Платформы без ключей — для отображения в /admin/usage */
export function getInactivePlatforms(): Array<{ key: string; name: string }> {
  return Object.entries(AI_CLIENTS)
    .filter(([, client]) => !client.isConfigured())
    .map(([key, client]) => ({ key, name: client.name }))
}

export const ACTIVE_PLATFORMS = Object.keys(AI_CLIENTS)
export type { AIClient }
export { AUDIT_SYSTEM_PROMPT } from "./types"
