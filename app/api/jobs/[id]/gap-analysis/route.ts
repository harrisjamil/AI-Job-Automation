import { NextResponse } from "next/server"
import { analyzeJobGap } from "@/lib/jobs/gap-analysis"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export const maxDuration = 60

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const job = await prisma.job.findFirst({
    where: { id, userId: user.id },
    select: { gapAnalysisJson: true, gapAnalyzedAt: true },
  })
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({
    analysis: job.gapAnalysisJson,
    analyzedAt: job.gapAnalyzedAt,
  })
}

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
    const analysis = await analyzeJobGap({ userId: user.id, jobId: id })
    return NextResponse.json({ analysis })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Gap analysis failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
