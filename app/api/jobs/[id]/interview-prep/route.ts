import { NextResponse } from "next/server"
import { generateInterviewPrep } from "@/lib/jobs/interview-prep"
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
    select: { interviewPrepJson: true, interviewPrepAt: true },
  })
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  return NextResponse.json({
    prep: job.interviewPrepJson,
    preparedAt: job.interviewPrepAt,
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
    const prep = await generateInterviewPrep({ userId: user.id, jobId: id })
    return NextResponse.json({ prep })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Interview prep failed"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
