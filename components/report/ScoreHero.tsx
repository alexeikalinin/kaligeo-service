"use client"

interface Props {
  companyName: string
  websiteUrl: string
  overallScore: number
  pdfUrl?: string | null
  completedAt?: Date | null
}

function scoreColor(score: number) {
  if (score >= 60) return "text-emerald-400"
  if (score >= 30) return "text-amber-400"
  return "text-red-400"
}

function scoreLabel(score: number) {
  if (score >= 60) return "Хорошая видимость"
  if (score >= 30) return "Средняя видимость"
  return "Низкая видимость"
}

export function ScoreHero({ companyName, websiteUrl, overallScore, pdfUrl, completedAt }: Props) {
  const date = completedAt
    ? new Date(completedAt).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <div className="flex flex-col items-center py-12 px-6 text-center">
      <p className="text-xs font-semibold tracking-widest text-zinc-500 uppercase mb-4">
        KALIGEO AI AUDIT
      </p>
      <h1 className="text-3xl font-bold text-zinc-100 mb-1">{companyName}</h1>
      <p className="text-zinc-500 text-sm mb-8">{websiteUrl}</p>

      <div className="relative w-40 h-40 flex items-center justify-center rounded-full bg-zinc-800 ring-4 ring-zinc-700 mb-4">
        <span className={`text-6xl font-bold ${scoreColor(overallScore)}`}>{overallScore}</span>
        <span className="absolute bottom-7 text-zinc-400 text-sm">/100</span>
      </div>

      <p className={`text-sm font-medium mb-1 ${scoreColor(overallScore)}`}>
        {scoreLabel(overallScore)}
      </p>
      {date && <p className="text-xs text-zinc-600">{date}</p>}

      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 px-5 py-2.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
        >
          Скачать PDF
        </a>
      )}
    </div>
  )
}
