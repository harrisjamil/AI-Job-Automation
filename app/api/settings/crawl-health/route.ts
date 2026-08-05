import { NextResponse } from "next/server"
import { getCrawlHealth } from "@/lib/jobs/scheduler"
import { getCurrentUser } from "@/lib/session"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const health = await getCrawlHealth(user.id)
  return NextResponse.json({ health })
}
