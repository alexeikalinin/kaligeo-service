"use client"

import { useState, useRef, KeyboardEvent } from "react"
import { useRouter } from "next/navigation"

interface CustomPrompt {
  id: string
  text: string
  enabled: boolean
}

interface BrandData {
  id: string
  companyName: string
  websiteUrl: string
  niche: string
  alternativeNames: string[]
  competitors: string[]
  customPrompts: CustomPrompt[]
}

interface Props {
  brand: BrandData | null
}

function TagInput({
  label,
  placeholder,
  values,
  onChange,
}: {
  label: string
  placeholder: string
  values: string[]
  onChange: (v: string[]) => void
}) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  function add() {
    const trimmed = input.trim()
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed])
    }
    setInput("")
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      add()
    } else if (e.key === "Backspace" && input === "" && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div>
      <label style={{ fontSize: "12px", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>
        {label}
      </label>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "8px 10px",
          border: "1px solid var(--rule)",
          borderRadius: "var(--radius-md)",
          background: "var(--bone)",
          cursor: "text",
          minHeight: "42px",
        }}
      >
        {values.map((v) => (
          <span
            key={v}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "var(--bone-2)",
              border: "1px solid var(--rule)",
              borderRadius: "4px",
              padding: "2px 8px",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "var(--ink-2)",
            }}
          >
            {v}
            <button
              onClick={(e) => { e.stopPropagation(); onChange(values.filter((x) => x !== v)) }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0, lineHeight: 1, fontSize: "14px" }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={add}
          placeholder={values.length === 0 ? placeholder : ""}
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            fontSize: "13px",
            color: "var(--ink)",
            flex: 1,
            minWidth: "120px",
          }}
        />
      </div>
      <p style={{ fontSize: "11px", color: "var(--ink-3)", marginTop: "4px" }}>
        Enter или запятая для добавления
      </p>
    </div>
  )
}

function PromptEditor({
  prompts,
  onChange,
}: {
  prompts: CustomPrompt[]
  onChange: (p: CustomPrompt[]) => void
}) {
  const [newText, setNewText] = useState("")

  function addPrompt() {
    const text = newText.trim()
    if (!text) return
    onChange([...prompts, { id: crypto.randomUUID(), text, enabled: true }])
    setNewText("")
  }

  function toggleEnabled(id: string) {
    onChange(prompts.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p)))
  }

  function remove(id: string) {
    onChange(prompts.filter((p) => p.id !== id))
  }

  return (
    <div>
      <label style={{ fontSize: "12px", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>
        Кастомные промпты
      </label>
      <div className="space-y-2 mb-3">
        {prompts.map((p) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 12px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              background: p.enabled ? "var(--bone)" : "var(--bone-2)",
              opacity: p.enabled ? 1 : 0.6,
            }}
          >
            <input
              type="checkbox"
              checked={p.enabled}
              onChange={() => toggleEnabled(p.id)}
              style={{ accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
            />
            <p style={{ flex: 1, fontSize: "13px", color: "var(--ink)", margin: 0 }}>{p.text}</p>
            <button
              onClick={() => remove(p.id)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--ink-3)",
                fontSize: "16px",
                padding: 0,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addPrompt()}
          placeholder="Кто использует продукты компании X для задачи Y?"
          style={{
            flex: 1,
            padding: "9px 12px",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            background: "var(--bone)",
            fontSize: "13px",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <button
          onClick={addPrompt}
          style={{
            padding: "9px 16px",
            background: "var(--bone-2)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-md)",
            fontSize: "13px",
            color: "var(--ink-2)",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          + Добавить
        </button>
      </div>
    </div>
  )
}

export default function BrandProfileEditor({ brand }: Props) {
  const router = useRouter()
  const isNew = !brand

  const [companyName, setCompanyName] = useState(brand?.companyName ?? "")
  const [websiteUrl, setWebsiteUrl] = useState(brand?.websiteUrl ?? "")
  const [niche, setNiche] = useState(brand?.niche ?? "")
  const [alternativeNames, setAlternativeNames] = useState<string[]>(brand?.alternativeNames ?? [])
  const [competitors, setCompetitors] = useState<string[]>(brand?.competitors ?? [])
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>(brand?.customPrompts ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    if (!companyName.trim() || !websiteUrl.trim()) {
      setError("Название компании и URL обязательны")
      return
    }
    setSaving(true)
    setError(null)

    const payload = { companyName, websiteUrl, niche, alternativeNames, competitors, customPrompts }

    try {
      const res = isNew
        ? await fetch("/api/client/brands", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/client/brands/${brand.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Ошибка сохранения")
      }

      router.push("/my/brands")
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения")
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!brand) return
    if (!confirm("Удалить профиль?")) return
    await fetch(`/api/client/brands/${brand.id}`, { method: "DELETE" })
    router.push("/my/brands")
    router.refresh()
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <button
        onClick={() => router.back()}
        style={{ fontSize: "13px", color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: "24px" }}
      >
        ← Назад
      </button>

      <h1
        className="text-2xl font-bold mb-8"
        style={{ fontFamily: "var(--font-serif)", color: "var(--ink)" }}
      >
        {isNew ? "Новый бренд-профиль" : "Редактировать профиль"}
      </h1>

      <div className="space-y-6">
        {/* Basic info */}
        <div>
          <label style={{ fontSize: "12px", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>
            Название компании
          </label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Astrum Entertainment"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              background: "var(--bone)",
              fontSize: "14px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>
            Сайт (URL)
          </label>
          <input
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://astrum-entertainment.ru"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              background: "var(--bone)",
              fontSize: "14px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: "12px", color: "var(--ink-3)", display: "block", marginBottom: "6px" }}>
            Ниша / отрасль
          </label>
          <input
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Геймдев, мобильные игры"
            style={{
              width: "100%",
              padding: "9px 12px",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-md)",
              background: "var(--bone)",
              fontSize: "14px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
        </div>

        <TagInput
          label="Альтернативные названия / псевдонимы"
          placeholder="Другое название, аббревиатура..."
          values={alternativeNames}
          onChange={setAlternativeNames}
        />

        <TagInput
          label="Конкуренты"
          placeholder="Gameloft, Rovio..."
          values={competitors}
          onChange={setCompetitors}
        />

        <PromptEditor prompts={customPrompts} onChange={setCustomPrompts} />

        {error && (
          <p style={{ color: "var(--danger)", fontSize: "13px" }}>{error}</p>
        )}

        <div style={{ display: "flex", gap: "10px", paddingTop: "8px" }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              flex: 1,
              padding: "11px 0",
              background: "var(--accent)",
              color: "var(--accent-ink)",
              border: "none",
              borderRadius: "var(--radius-md)",
              fontSize: "14px",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          {!isNew && (
            <button
              onClick={handleDelete}
              style={{
                padding: "11px 20px",
                background: "none",
                color: "var(--danger)",
                border: "1px solid var(--danger)",
                borderRadius: "var(--radius-md)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
