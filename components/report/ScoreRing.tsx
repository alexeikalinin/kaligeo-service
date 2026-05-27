"use client"

import { useEffect, useRef, useState } from "react"

interface Props {
  score: number
  size?: number
  strokeWidth?: number
  animated?: boolean
}

function scoreColor(score: number) {
  if (score >= 60) return "var(--accent)"
  if (score >= 30) return "#f59e0b"
  return "#ef4444"
}

export function ScoreRing({ score, size = 136, strokeWidth = 10, animated = false }: Props) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2
  const cy = size / 2
  const color = scoreColor(score)

  const [displayed, setDisplayed] = useState(animated ? 0 : score)
  const rafRef = useRef<number>(null)

  useEffect(() => {
    if (!animated) return
    const start = performance.now()
    const duration = 800

    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * score))
      if (progress < 1) rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [score, animated])

  const dash = (displayed / 100) * circ

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--rule)" strokeWidth={strokeWidth} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text
        x={cx}
        y={cy + size * 0.08}
        textAnchor="middle"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: `${size * 0.22}px`,
          fontWeight: "bold",
          fill: color,
        }}
      >
        {displayed}
      </text>
    </svg>
  )
}
