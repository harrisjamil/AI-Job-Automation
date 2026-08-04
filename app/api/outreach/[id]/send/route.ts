import { NextResponse } from "next/server"
import { sendOutreachEmail } from "@/lib/email/send"
import { getCurrentUser } from "@/lib/session"

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
    const email = await sendOutreachEmail(id, user.id)
    return NextResponse.json({ email })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
