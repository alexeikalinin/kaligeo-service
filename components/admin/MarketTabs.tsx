import Link from "next/link"

const TABS: { value: "all" | "ru" | "by"; label: string }[] = [
  { value: "all", label: "Все домены" },
  { value: "ru", label: "kaligeo.ru" },
  { value: "by", label: "kaligeo.by" },
]

export function MarketTabs({ current, basePath = "/admin" }: { current: "all" | "ru" | "by"; basePath?: string }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-[#E5E5E1] rounded-lg p-1">
      {TABS.map((tab) => {
        const active = tab.value === current
        const href = tab.value === "all" ? basePath : `${basePath}?market=${tab.value}`
        return (
          <Link
            key={tab.value}
            href={href}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              active ? "bg-[#C8F24A] text-[#0F1115] font-semibold" : "text-[#6A6D75] hover:text-[#0F1115]"
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
