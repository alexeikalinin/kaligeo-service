export function auditFailure(message: string | null | undefined, status?: string) {
  const text = message ?? ""
  let stage = "Выполнение аудита"
  let reason = "Не удалось завершить этап. Требуется проверка оператором."
  let action = "Мы проверим причину и продолжим этот заказ. Повторная оплата не нужна."
  if (/карта бизнеса|No output generated|No object generated|UnfinishedBusinessMap/i.test(text)) {
    stage = "Карта бизнеса"
    reason = "ИИ не вернул завершённую карту бизнеса. По неполному результату вопросы не отправляются."
    action = "Оператору необходимо исправить подготовку карты и повторить этот этап, затем согласовать карту и вопросы."
  } else if (/Проверка доступности ИИ|недостаточно средств|баланс|quota|payment|402|429|квот|лимит|платформ/i.test(text)) {
    stage = "Проверка доступности ИИ"
    reason = "Одна из необходимых ИИ-платформ недоступна: возможна нехватка баланса, квоты или ошибка подключения."
    action = "Оператору необходимо проверить доступность и баланс платформ, затем продолжить этот заказ."
  } else if (status === "EXECUTING_QUERIES") stage = "Опрос ИИ-платформ"
  else if (status === "ANALYZING") stage = "Анализ ответов"
  else if (status === "GENERATING_REPORT") stage = "Формирование отчёта"
  else if (status === "DELIVERING") stage = "Доставка отчёта"
  else if (status === "GENERATING_QUERIES") stage = "Подготовка вопросов"
  if (/timeout|timed out|время ожидания/i.test(text)) {
    reason = "Превышено время ожидания ответа на этом этапе."
  }
  for (const known of ["Опрос ИИ-платформ", "Анализ ответов", "Формирование отчёта", "Доставка отчёта", "Подготовка вопросов"]) {
    if (text.startsWith(`${known}:`)) stage = known
  }
  if (stage === "Проверка доступности ИИ") {
    const providers = ["ChatGPT", "Gemini", "YandexGPT", "Perplexity", "DeepSeek", "Алиса", "Grok", "Claude", "GigaChat"].filter(name => text.toLowerCase().includes(name.toLowerCase()))
    const prefix = providers.length ? `${providers.join(", ")}: ` : ""
    if (/недостаточно средств|требуется оплата/i.test(text)) reason = `${prefix}недостаточно средств у провайдера.`
    else if (/исчерпана|превышена квота/i.test(text)) reason = `${prefix}исчерпана или превышена квота провайдера.`
    else if (/авторизац/i.test(text)) reason = `${prefix}провайдер отклонил авторизацию; необходимо проверить API-ключ.`
    else if (/частота запросов/i.test(text)) reason = `${prefix}превышена допустимая частота запросов.`
    else if (providers.length) reason = `${prefix}платформа не выполнила проверочный запрос.`
  }
  return { stage, reason, action }
}
