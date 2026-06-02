import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { AI_CLIENTS } from "@/lib/ai-clients"

async function isAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN
}

const QUESTION = "Назови столицу Франции одним словом."

export async function GET() {
  if (!(await isAuthed())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = await Promise.allSettled(
    Object.entries(AI_CLIENTS).map(async ([key, client]) => {
      const configured = client.isConfigured()
      if (!configured) {
        return { key, name: client.name, status: "unconfigured", response: null, ms: 0 }
      }
      const t0 = Date.now()
      try {
        const response = await Promise.race([
          client.query(QUESTION, "Отвечай коротко и по делу."),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout 15s")), 15_000)),
        ])
        return { key, name: client.name, status: "ok", response: String(response).slice(0, 200), ms: Date.now() - t0 }
      } catch (e) {
        return { key, name: client.name, status: "error", response: null, error: String(e), ms: Date.now() - t0 }
      }
    })
  )

  const data = results.map((r) => (r.status === "fulfilled" ? r.value : { status: "error", error: String(r.reason) }))
  return NextResponse.json({ question: QUESTION, results: data })
}
