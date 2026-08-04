import { NextResponse } from "next/server"
import { runAutoApply } from "@/lib/auto-apply"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export const maxDuration = 120

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  })
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    regenerateDocuments?: boolean
    markApplied?: boolean
  }

  try {
    const result = await runAutoApply({
      userId: user.id,
      jobId: job.id,
      regenerateDocuments: Boolean(body.regenerateDocuments),
      markApplied:
        typeof body.markApplied === "boolean" ? body.markApplied : undefined,
    })
    return NextResponse.json({
      ok: true,
      application: result.application,
      applyPackage: result.applyPackage,
      applyUrl: result.applyUrl,
      markedApplied: result.markedApplied,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Auto-apply failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
