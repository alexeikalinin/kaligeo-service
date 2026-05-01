"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, isTextUIPart, type UIMessage } from "ai"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

const transport = new DefaultChatTransport({ api: "/api/chat" })

const WELCOME_MESSAGE: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text: "Готов запустить AI-аудит. Введите URL сайта — проанализирую его и задам точечные вопросы по вашей нише.",
    },
  ],
}

export default function ChatPage() {
  const router = useRouter()
  const bottomRef = useRef<HTMLDivElement>(null)
  const [inputValue, setInputValue] = useState("")
  const [jobId, setJobId] = useState<string | null>(null)

  const { messages, sendMessage, status } = useChat({
    transport,
    messages: [WELCOME_MESSAGE],
  })

  useEffect(() => {
    for (const msg of messages) {
      for (const part of msg.parts ?? []) {
        const p = part as Record<string, unknown>
        if (
          typeof p.type === "string" &&
          p.type.startsWith("tool-") &&
          p.toolName === "submit_audit" &&
          p.state === "result" &&
          p.output &&
          typeof p.output === "object" &&
          "jobId" in p.output
        ) {
          setJobId((p.output as { jobId: string }).jobId)
        }
      }
    }
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const isLoading = status === "submitted" || status === "streaming"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading || jobId) return
    sendMessage({ text: inputValue })
    setInputValue("")
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bone)", color: "var(--ink)" }}>

      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--rule)", background: "var(--bone)" }}
        className="flex items-center px-6 py-4 gap-4">
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, letterSpacing: "-0.02em" }}>
          KaliGEO
        </span>
        <span className="t-eyebrow" style={{ marginLeft: 4 }}>AI Visibility Audit</span>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/report/recover"
            className="t-eyebrow hover:opacity-60 transition-opacity"
            style={{ fontSize: 10 }}>
            Найти отчёт
          </Link>
          <Link href="/admin"
            className="t-eyebrow hover:opacity-60 transition-opacity"
            style={{ fontSize: 10 }}>
            Admin
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-2xl mx-auto w-full space-y-6">

          {messages.map((msg) => {
            const text = (msg.parts ?? [])
              .filter(isTextUIPart)
              .map((p) => p.text)
              .join("")
            if (!text) return null

            return (
              <div key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                {msg.role === "assistant" && (
                  <div className="mr-3 mt-1 shrink-0">
                    <div className="monotag monotag-solid" style={{ fontSize: 9, padding: "3px 6px" }}>
                      AI
                    </div>
                  </div>
                )}
                <div
                  style={{
                    maxWidth: "80%",
                    fontFamily: "var(--font-sans)",
                    fontSize: 15,
                    lineHeight: 1.6,
                    padding: "12px 16px",
                    borderRadius: 12,
                    whiteSpace: "pre-wrap",
                    ...(msg.role === "user"
                      ? {
                          background: "var(--ink)",
                          color: "var(--bone)",
                          borderBottomRightRadius: 4,
                        }
                      : {
                          background: "var(--bone-2)",
                          color: "var(--ink)",
                          border: "1px solid var(--rule)",
                          borderBottomLeftRadius: 4,
                        }),
                  }}>
                  {text}
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex justify-start items-center gap-3">
              <div className="monotag monotag-solid" style={{ fontSize: 9, padding: "3px 6px" }}>AI</div>
              <div style={{
                background: "var(--bone-2)",
                border: "1px solid var(--rule)",
                borderRadius: 12,
                borderBottomLeftRadius: 4,
                padding: "12px 16px",
                display: "flex",
                gap: 4,
              }}>
                {[0, 150, 300].map((d) => (
                  <span key={d} style={{
                    width: 6, height: 6, borderRadius: "50%",
                    background: "var(--ink-3)",
                    display: "inline-block",
                    animation: "bounce 1s ease infinite",
                    animationDelay: `${d}ms`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* Job launched */}
          {jobId && (
            <div className="flex justify-center py-4">
              <div style={{
                background: "var(--bone-2)",
                border: "1px solid var(--rule)",
                borderRadius: 14,
                padding: "20px 28px",
                textAlign: "center",
                maxWidth: 380,
              }}>
                <p className="t-eyebrow" style={{ marginBottom: 8 }}>Аудит запущен</p>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--ink-2)", marginBottom: 16 }}>
                  Анализируем все платформы. Это займёт 20–60 минут.
                </p>
                <button
                  onClick={() => router.push(`/audit/${jobId}`)}
                  style={{
                    fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13,
                    padding: "10px 20px", borderRadius: 8,
                    background: "var(--accent)", border: "none", color: "var(--accent-ink)",
                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
                  }}>
                  Смотреть прогресс →
                </button>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div style={{ borderTop: "1px solid var(--rule)", background: "var(--bone)", padding: "16px" }}>
        <form onSubmit={handleSubmit}
          className="flex gap-3 max-w-2xl mx-auto w-full items-center">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={jobId ? "Аудит запущен" : "Введите URL сайта или напишите сообщение..."}
            disabled={isLoading || !!jobId}
            style={{
              flex: 1,
              fontFamily: "var(--font-sans)", fontSize: 14,
              padding: "11px 16px",
              borderRadius: 8,
              border: "1px solid var(--rule)",
              background: "var(--bone-2)",
              color: "var(--ink)",
              outline: "none",
              opacity: (isLoading || jobId) ? 0.5 : 1,
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim() || !!jobId}
            style={{
              fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13,
              padding: "11px 18px",
              borderRadius: 8,
              background: "var(--accent)",
              border: "1px solid var(--accent)",
              color: "var(--accent-ink)",
              cursor: "pointer",
              opacity: (isLoading || !inputValue.trim() || jobId) ? 0.4 : 1,
              transition: "opacity 0.15s",
            }}>
            →
          </button>
        </form>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  )
}
