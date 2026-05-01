import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { runOrchestrator } from "@/lib/agents/orchestrator"

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const isAuthed =
    cookieStore.get("admin_session")?.value === process.env.ADMIN_SESSION_TOKEN

  if (!isAuthed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { task, context } = await req.json()
  if (!task) return NextResponse.json({ error: "task required" }, { status: 400 })

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = await runOrchestrator(task, context ?? {})
        controller.enqueue(new TextEncoder().encode(result))
      } catch (err) {
        controller.enqueue(
          new TextEncoder().encode(
            `Error: ${err instanceof Error ? err.message : String(err)}`
          )
        )
      } finally {
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
