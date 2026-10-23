/** Prefer the site's public brand when a form contains only a legal entity name. */
export function resolveAuditBrand(submitted: string, detected: string): string {
  const value = submitted.trim()
  const legalEntity = /^(?:ИП|ООО|ОАО|ЗАО|АО|ЧУП|УП|ОДО|СООО|ИООО)(?:\s|[«"“]|$)/i.test(value)
  return (!value || legalEntity) && detected.trim() ? detected.trim() : value
}
