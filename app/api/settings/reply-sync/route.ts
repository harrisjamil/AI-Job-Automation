import { NextResponse } from "next/server"
import { syncRepliesForUser } from "@/lib/email/reply-sync"
import { getCurrentUser } from "@/lib/session"

export const maxDuration = 120

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await syncRepliesForUser(user.id)
  if (result.error && result.updated === 0 && result.scanned === 0) {
    return NextResponse.json(
      { error: result.error, ...result },
      { status: 400 }
    )
  }
  return NextResponse.json({ ok: true, ...result })
}
