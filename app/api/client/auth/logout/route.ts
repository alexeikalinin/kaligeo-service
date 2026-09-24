import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const response = NextResponse.redirect(new URL("/my/login", req.url))
  response.cookies.set("client_session", "", { maxAge: 0, path: "/" })
  return response
}
