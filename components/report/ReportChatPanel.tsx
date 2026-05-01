"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, isTextUIPart, type UIMessage } from "ai"
import { useEffect, useRef, useState } from "react"

interface ChatStatus {
  tier: string
  chatMessagesUsed: number
  chatMessageLimit: number | null
  canChat: boolean
  limitReached: boolean
}

interface Props {
  jobId: string
  token: string
  companyName: string
}

export function ReportChatPanel({ jobId, token, companyName }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [chatStatus, setChatStatus] = useState<ChatStatus | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch(`/api/report/${jobId}/chat?token=${token}`)
      .then((r) => r.json())
      .then(setChatStatus)
      .catch(() => null)
  }, [jobId, token])

  const transport = new DefaultChatTransport({
    api: `/api/report/${jobId}/chat`,
    body: { token },
  })

  const welcomeMessage: UIMessage = {
    id: "welcome",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: `Привет! Я помогу разобраться с результатами аудита **${companyName}**. Задайте любой вопрос по отчёту — что означают цифры, с чего начать, как обогнать конкурентов.`,
      },
    ],
  }

  const { messages, sendMessage, status, error } = useChat({
    transport,
    messages: [welcomeMessage],
  })

  const isLoading = status === "submitted" || status === "streaming"
  const usedCount = chatStatus ? chatStatus.chatMessagesUsed + messages.filter(m => m.role === "user").length : 0
  const limit = chatStatus?.chatMessageLimit
  const remaining = limit !== null && limit !== undefined ? Math.max(0, limit - usedCount) : null

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return
    if (chatStatus?.limitReached || (remaining !== null && remaining <= 0)) return
    sendMessage({ text: inputValue })
    setInputValue("")
  }

  // Determine what to show for Basic users
  if (chatStatus && !chatStatus.canChat) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-5 max-w-xs shadow-2xl">
          <p className="text-zinc-100 font-semibold text-sm mb-1">Спросить AI о вашем аудите</p>
          <p className="text-zinc-400 text-xs mb-4">
            Доступно на тарифах Standard и Advanced — задайте вопросы по вашим данным
          </p>
          <a
            href="https://kaligeo.vercel.app/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold hover:bg-white transition-colors"
          >
            Обновить тариф →
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-zinc-100 text-zinc-900 rounded-2xl font-semibold text-sm shadow-2xl hover:bg-white transition-all"
        >
          <span>💬</span>
          <span>Спросить AI</span>
          {remaining !== null && (
            <span className="ml-1 text-xs text-zinc-500">
              {remaining} из {limit}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:w-[420px] sm:bottom-6 sm:right-6 flex flex-col bg-zinc-900 border border-zinc-700 sm:rounded-2xl shadow-2xl max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div>
              <p className="text-sm font-semibold text-zinc-100">AI-консультант</p>
              {remaining !== null && (
                <p className="text-xs text-zinc-500">{remaining} вопросов осталось</p>
              )}
              {remaining === null && (
                <p className="text-xs text-emerald-500">Безлимитный доступ</p>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-zinc-500 hover:text-zinc-300 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[200px]">
            {messages.map((msg) => {
              const text = (msg.parts ?? [])
                .filter(isTextUIPart)
                .map((p) => p.text)
                .join("")
              if (!text) return null
              return (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-zinc-700 text-zinc-100 rounded-br-sm"
                        : "bg-zinc-800 text-zinc-200 rounded-bl-sm"
                    }`}
                  >
                    {text}
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-3 py-2">
                  <span className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}

            {/* Limit reached */}
            {remaining !== null && remaining <= 0 && !isLoading && (
              <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 text-center">
                <p className="text-zinc-300 text-sm mb-3">
                  Вы использовали все {limit} вопросов тарифа Standard
                </p>
                <a
                  href="https://kaligeo.vercel.app/#pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-sm font-semibold hover:bg-white transition-colors"
                >
                  Перейти на Advanced →
                </a>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-xs text-center">Ошибка соединения. Попробуйте ещё раз.</p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-800 px-3 py-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={remaining === 0 ? "Лимит исчерпан" : "Задайте вопрос по отчёту..."}
                disabled={isLoading || (remaining !== null && remaining <= 0)}
                className="flex-1 bg-zinc-800 text-zinc-100 placeholder-zinc-600 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim() || (remaining !== null && remaining <= 0)}
                className="px-3 py-2 bg-zinc-100 text-zinc-900 rounded-xl text-sm font-bold hover:bg-white transition-colors disabled:opacity-40"
              >
                →
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
