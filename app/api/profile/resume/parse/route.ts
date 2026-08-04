import { NextResponse } from "next/server"
import { parseAndApplyResume } from "@/lib/resume/parse"
import { getCurrentUser } from "@/lib/session"

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      resumeId?: string
      applyToProfile?: boolean
    }

    const result = await parseAndApplyResume({
      userId: currentUser.id,
      resumeId: body.resumeId,
      applyToProfile: body.applyToProfile !== false,
    })

    return NextResponse.json({
      resume: result.resume,
      parsed: result.parsed,
      profileUpdated: result.profileUpdated,
      usedAi: result.usedAi,
    })
  } catch (error) {
    console.error("Resume parse failed:", error)
    const message =
      error instanceof Error ? error.message : "Unable to parse resume."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
