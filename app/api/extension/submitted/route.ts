import { NextResponse } from "next/server"
import {
  authenticateExtensionToken,
  getBearerToken,
} from "@/lib/extension/auth"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

/**
 * Mark an apply package as submitted (from Chrome extension or dashboard).
 */
export async function POST(request: Request) {
  let userId: string | null = null

  const bearer = getBearerToken(request)
  if (bearer) {
    const extUser = await authenticateExtensionToken(bearer)
    userId = extUser?.id ?? null
  } else {
    const session = await getCurrentUser()
    userId = session?.id ?? null
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string
  }

  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }

  const application = await prisma.jobApplication.findFirst({
    where: { userId, jobId: body.jobId },
  })

  if (!application) {
    return NextResponse.json(
      { error: "Application not found — prepare auto-apply first" },
      { status: 404 }
    )
  }

  const now = new Date()
  const updated = await prisma.jobApplication.update({
    where: { id: application.id },
    data: {
      autoApplyStatus: "submitted",
      status: application.status === "saved" ? "applied" : application.status,
      appliedAt: application.appliedAt ?? now,
      statusChangedAt: now,
      autoApplyError: null,
    },
  })

  return NextResponse.json({ ok: true, application: updated })
}
