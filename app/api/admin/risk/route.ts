import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { runRiskAgent } from "@/lib/agents/risk-agent"

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN

  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const report = await runRiskAgent()
  return NextResponse.json(report)
}
