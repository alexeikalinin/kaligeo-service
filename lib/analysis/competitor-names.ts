/** Category labels are not named competitors and must not become ranked brands. */
export function isCompetitorCategory(name: string): boolean {
  return /^(?:интернет[- ]магазины|ритейлеры|специализированные\s+(?:игровые\s+)?магазины|магазины\s+(?:видеоигр|электроники)|сети\s+розничной\s+торговли|online\s+stores|gaming\s+retailers)(?:\s|$)/i.test(name.trim())
}
export function namedCompetitors(names: string[]): string[] {
  return names.map(name => name.trim()).filter(name => !!name && !isCompetitorCategory(name))
}
