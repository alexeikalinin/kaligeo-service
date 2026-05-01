"use client"

export default function ReportError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-red-400 font-medium mb-2">Ошибка загрузки отчёта</p>
        <button
          onClick={reset}
          className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  )
}
