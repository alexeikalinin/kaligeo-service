import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  outputFileTracingIncludes: { "/": ["./landing/ru/index.html", "./landing/by/index.html"], "/api/report/generate-pdf": ["./public/fonts/*.ttf"] },
}

export default nextConfig
