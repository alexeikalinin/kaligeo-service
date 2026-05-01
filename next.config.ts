import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Allow freemium API calls from landing page
        source: "/api/freemium/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.LANDING_ORIGIN ?? "https://kaligeo.ru",
          },
          { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
        ],
      },
    ]
  },
}

export default nextConfig
