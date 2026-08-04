import { NextResponse } from "next/server"
import { runScheduledCrawls } from "@/lib/jobs/scheduler"

export const maxDuration = 300

/**
 * Scheduler endpoint for multi-source aggregation.
 * Protect with CRON_SECRET: Authorization Bearer token.
 * See vercel.json for the every-6-hours cron schedule.
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

  const force = new URL(request.url).searchParams.get("force") === "1"

  try {
    const summary = await runScheduledCrawls({ force })
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Scheduled crawl failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
