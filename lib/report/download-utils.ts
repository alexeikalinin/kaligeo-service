export function attachmentHeader(filename: string, fallback: string): string {
  const encoded = encodeURIComponent(filename).replace(/['()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
  return `attachment; filename="${fallback.replace(/[^a-zA-Z0-9_.-]/g, "-")}"; filename*=UTF-8''${encoded}`
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!)
}

export function escapeHtmlValues<T>(value: T): T {
  if (typeof value === "string") return escapeHtml(value) as T
  if (Array.isArray(value)) return value.map(escapeHtmlValues) as T
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, escapeHtmlValues(child)])) as T
  }
  return value
}
