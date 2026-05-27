import { NextResponse } from "next/server"

export async function POST() {
  const response = NextResponse.redirect(
    new URL("/my/login", process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kaligeo.ru")
  )
  response.cookies.set("client_session", "", { maxAge: 0, path: "/" })
  return response
}
