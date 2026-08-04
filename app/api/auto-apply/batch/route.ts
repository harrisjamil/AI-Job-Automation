import { NextResponse } from "next/server"
import { runAutoApplyBatch } from "@/lib/auto-apply"
import { getCurrentUser } from "@/lib/session"

export const maxDuration = 300

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    jobIds?: string[]
    minScore?: number
    limit?: number
    regenerateDocuments?: boolean
  }

  try {
    const summary = await runAutoApplyBatch({
      userId: user.id,
      jobIds: Array.isArray(body.jobIds) ? body.jobIds : undefined,
      minScore:
        typeof body.minScore === "number" ? body.minScore : undefined,
      limit: typeof body.limit === "number" ? body.limit : 5,
      regenerateDocuments: Boolean(body.regenerateDocuments),
    })
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Batch auto-apply failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
