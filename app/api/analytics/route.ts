import { NextResponse } from "next/server"
import { getAnalyticsSummary } from "@/lib/analytics"
import { getCurrentUser } from "@/lib/session"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const summary = await getAnalyticsSummary(user.id)
  return NextResponse.json({ summary })
}
