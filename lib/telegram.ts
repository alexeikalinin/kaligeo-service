const BASE = () =>
  `https://api.telegram.org/bot${process.env.ADMIN_TELEGRAM_BOT_TOKEN}`

async function call(method: string, body: object) {
  try {
    const res = await fetch(`${BASE()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.json()
  } catch {
    // non-fatal
  }
}

export const tg = {
  send(chatId: string | number, text: string, extra?: object) {
    return call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", ...extra })
  },

  edit(chatId: string | number, messageId: number, text: string, extra?: object) {
    return call("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      ...extra,
    })
  },

  answer(callbackQueryId: string, text?: string) {
    return call("answerCallbackQuery", { callback_query_id: callbackQueryId, text })
  },

  setWebhook(url: string, secretToken: string) {
    return call("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["message", "callback_query"],
    })
  },
}

export function inlineKeyboard(rows: { text: string; data: string }[][]) {
  return {
    reply_markup: {
      inline_keyboard: rows.map((row) =>
        row.map((btn) => ({ text: btn.text, callback_data: btn.data }))
      ),
    },
  }
}
