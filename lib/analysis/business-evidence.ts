export interface ExternalServiceEvidence { service: string; quote: string }
const normalize = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim()
export function verifiedExternalServices(value: unknown, pageText: string): ExternalServiceEvidence[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is ExternalServiceEvidence => {
    if (!item || typeof item.service !== "string" || typeof item.quote !== "string" || item.quote.trim().length < 15) return false
    return normalize(pageText).includes(normalize(item.quote)) && /услуг|на заказ|под ключ|клиент|партн[её]р|сотруднич|publish your|for clients|services|your game/i.test(item.quote)
  })
}

export function requestsUnverifiedExternalService(query: string, hasVerifiedServices: boolean): boolean {
  if (hasVerifiedServices) return false
  return /под ключ|на заказ|аутсорс|заказать разработк|сто(?:ит|имость) разработк|цен[аыу] (?:на )?разработк|услуг[аиу].*(?:разработ|маркетинг|поддерж)|(?:компани|студи|агентств).*(?:для разработки|для продвижения|для издания|для.*поддержки)|(?:наш|мо[яей]).*(?:студи|стартап)|(?:я|мы) .*(?:разработчик|разработали|разработал[аи]?|выпустили)|indie studio|my game|our game|our studio|development cost|hire .*developer/i.test(query)
}
