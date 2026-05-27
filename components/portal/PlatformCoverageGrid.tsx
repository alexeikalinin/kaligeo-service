const PLATFORM_META: Record<string, { label: string; emoji: string }> = {
  CHATGPT:   { label: "ChatGPT",   emoji: "🟢" },
  CLAUDE:    { label: "Claude",    emoji: "🟠" },
  GEMINI:    { label: "Gemini",    emoji: "🔵" },
  PERPLEXITY:{ label: "Perplexity",emoji: "🟣" },
  DEEPSEEK:  { label: "DeepSeek", emoji: "🔷" },
  YANDEXGPT: { label: "YandexGPT",emoji: "🔴" },
  GIGACHAT:  { label: "GigaChat", emoji: "⚡" },
  ALISA:     { label: "Алиса",    emoji: "🎙" },
  GROK:      { label: "Grok",     emoji: "✖" },
}

interface Props {
  selectedPlatforms: string[]
  coveredPlatforms: string[]
}

export default function PlatformCoverageGrid({ selectedPlatforms, coveredPlatforms }: Props) {
  const coveredSet = new Set(coveredPlatforms)

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
        gap: "8px",
      }}
    >
      {selectedPlatforms.map((platform) => {
        const meta = PLATFORM_META[platform] ?? { label: platform, emoji: "●" }
        const covered = coveredSet.has(platform)

        return (
          <div
            key={platform}
            style={{
              background: covered ? "var(--bone-2)" : "var(--bone)",
              border: `1px solid ${covered ? "var(--rule)" : "var(--rule)"}`,
              borderRadius: "var(--radius-md)",
              padding: "10px 8px",
              textAlign: "center",
              opacity: covered ? 1 : 0.45,
            }}
          >
            <div style={{ fontSize: "18px", marginBottom: "4px" }}>{meta.emoji}</div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: covered ? "var(--ink-2)" : "var(--ink-3)",
                fontWeight: covered ? 600 : 400,
                letterSpacing: "0.02em",
              }}
            >
              {meta.label}
            </div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "10px",
                color: covered ? "var(--success)" : "var(--ink-3)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {covered ? "✓" : "—"}
            </div>
          </div>
        )
      })}
    </div>
  )
}
