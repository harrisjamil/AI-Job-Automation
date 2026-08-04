import { NextResponse } from "next/server"
import { runJobCrawl } from "@/lib/jobs/ingest"
import { getCurrentUser } from "@/lib/session"

export const maxDuration = 180

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const crawlRun = await runJobCrawl(user.id)
    return NextResponse.json({ crawlRun })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start crawl"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
