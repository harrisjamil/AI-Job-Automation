import { NextResponse } from "next/server"
import { sendDueFollowUpReminders } from "@/lib/email/follow-ups"

export const maxDuration = 120

/**
 * Daily follow-up reminder cron.
 * Protect with CRON_SECRET: Authorization Bearer token.
 */
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
    const summary = await sendDueFollowUpReminders()
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Follow-up reminders failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
