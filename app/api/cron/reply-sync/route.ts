import { NextResponse } from "next/server"
import { syncRepliesForAllUsers } from "@/lib/email/reply-sync"

export const maxDuration = 180

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get("authorization")
    const url = new URL(request.url)
    const token =
      auth?.replace(/^Bearer\s+/i, "") || url.searchParams.get("secret")
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const summary = await syncRepliesForAllUsers()
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Reply sync failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
