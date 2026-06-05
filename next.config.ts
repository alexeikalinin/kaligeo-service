import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async headers() {
    const landingOrigins = [
      process.env.LANDING_ORIGIN ?? "https://kaligeo.ru",
      "https://kaligeo.by",
    ].join(", ")
    const corsHeaders = [
      { key: "Access-Control-Allow-Origin", value: landingOrigins },
      { key: "Access-Control-Allow-Methods", value: "POST, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type, Accept" },
    ]
    return [
      {
        source: "/api/freemium/:path*",
        headers: corsHeaders,
      },
      {
        source: "/api/contact",
        headers: corsHeaders,
      },
      {
        // Allow paid audit submission + payment from landing pages
        source: "/api/audit/submit",
        headers: corsHeaders,
      },
      {
        source: "/api/payment/create",
        headers: corsHeaders,
      },
    ]
  },
}

export default nextConfig
