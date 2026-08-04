import { NextResponse } from "next/server"
import { enrichJobsBatch } from "@/lib/jobs/enrich-contacts"
import { getCurrentUser } from "@/lib/session"

export const maxDuration = 120

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    limit?: number
    minScore?: number
  }

  try {
    const results = await enrichJobsBatch(user.id, {
      limit: body.limit,
      minScore: body.minScore,
    })
    return NextResponse.json({ results })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Batch enrich failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
