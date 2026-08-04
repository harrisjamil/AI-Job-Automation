import { NextResponse } from "next/server"
import { enrichJobContacts } from "@/lib/jobs/enrich-contacts"
import { getCurrentUser } from "@/lib/session"

export const maxDuration = 60

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const contacts = await enrichJobContacts(id, user.id)
    return NextResponse.json({ contacts })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to enrich contacts"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
