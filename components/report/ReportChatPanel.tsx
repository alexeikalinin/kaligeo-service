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
  const usedCount = chatStatus
    ? chatStatus.chatMessagesUsed + messages.filter((m) => m.role === "user").length
    : 0
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

  if (chatStatus && !chatStatus.canChat) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div
          className="rounded-2xl p-5 max-w-xs"
          style={{
            background: "var(--bone)",
            border: "1px solid var(--rule)",
          }}
        >
          <p className="font-semibold text-sm mb-1" style={{ color: "var(--ink)" }}>
            Спросить AI о вашем аудите
          </p>
          <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>
            Доступно на тарифах Standard и Advanced
          </p>
          <a
            href="https://kaligeo.vercel.app/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center py-2 rounded text-sm font-semibold transition-opacity hover:opacity-70"
            style={{ background: "var(--ink)", color: "var(--bone)" }}
          >
            Обновить тариф →
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--ink)", color: "var(--bone)" }}
        >
          <span>✦</span>
          <span>Спросить AI</span>
          {remaining !== null && (
            <span className="ml-1 text-xs opacity-60">
              {remaining}/{limit}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-0 right-0 z-50 w-full sm:w-[420px] sm:bottom-6 sm:right-6 flex flex-col sm:rounded-2xl max-h-[85vh]"
          style={{ background: "var(--bone)", border: "1px solid var(--rule)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--rule)" }}
          >
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                AI-консультант
              </p>
              {remaining !== null ? (
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                  {remaining} вопросов осталось
                </p>
              ) : (
                <p className="text-xs" style={{ color: "var(--accent)", filter: "brightness(0.7)" }}>
                  Безлимитный доступ
                </p>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-xl leading-none transition-opacity hover:opacity-50"
              style={{ color: "var(--ink-3)" }}
            >
              ×
            </button>
          </div>

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
                    className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap"
                    style={
                      msg.role === "user"
                        ? { background: "var(--ink)", color: "var(--bone)", borderBottomRightRadius: "4px" }
                        : { background: "var(--bone-2)", color: "var(--ink)", border: "1px solid var(--rule)", borderBottomLeftRadius: "4px" }
                    }
                  >
                    {text}
                  </div>
                </div>
              )
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div
                  className="rounded-2xl px-3 py-2"
                  style={{ background: "var(--bone-2)", border: "1px solid var(--rule)", borderBottomLeftRadius: "4px" }}
                >
                  <span className="flex gap-1">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ background: "var(--ink-3)", animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                </div>
              </div>
            )}

            {remaining !== null && remaining <= 0 && !isLoading && (
              <div
                className="rounded-xl p-4 text-center"
                style={{ border: "1px solid var(--rule)", background: "var(--bone-2)" }}
              >
                <p className="text-sm mb-3" style={{ color: "var(--ink-2)" }}>
                  Вы использовали все {limit} вопросов тарифа Standard
                </p>
                <a
                  href="https://kaligeo.vercel.app/#pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2 rounded text-sm font-semibold transition-opacity hover:opacity-70"
                  style={{ background: "var(--ink)", color: "var(--bone)" }}
                >
                  Перейти на Advanced →
                </a>
              </div>
            )}

            {error && (
              <p className="text-xs text-center" style={{ color: "#ef4444" }}>
                Ошибка соединения. Попробуйте ещё раз.
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="px-3 py-3 border-t" style={{ borderColor: "var(--rule)" }}>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={remaining === 0 ? "Лимит исчерпан" : "Задайте вопрос по отчёту..."}
                disabled={isLoading || (remaining !== null && remaining <= 0)}
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-50"
                style={{
                  background: "var(--bone-2)",
                  border: "1px solid var(--rule)",
                  color: "var(--ink)",
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim() || (remaining !== null && remaining <= 0)}
                className="px-3 py-2 rounded-lg text-sm font-bold transition-opacity disabled:opacity-40"
                style={{ background: "var(--ink)", color: "var(--bone)" }}
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
