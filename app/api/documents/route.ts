import { NextResponse } from "next/server"
import { draftCoverLetter } from "@/lib/documents/cover-letter"
import { isDocumentType } from "@/lib/documents/shared"
import { draftTailoredResume } from "@/lib/documents/tailor-resume"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const jobId = searchParams.get("jobId")?.trim() ?? ""
  const type = searchParams.get("type")?.trim() ?? ""

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }

  const job = await prisma.job.findFirst({
    where: { id: jobId, userId: user.id },
    select: { id: true },
  })
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const documents = await prisma.jobDocument.findMany({
    where: {
      userId: user.id,
      jobId,
      ...(type && isDocumentType(type) ? { type } : {}),
    },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ documents })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string
    type?: string
  }

  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }
  if (!body.type || !isDocumentType(body.type)) {
    return NextResponse.json(
      { error: "type must be cover_letter or tailored_resume" },
      { status: 400 }
    )
  }

  const job = await prisma.job.findFirst({
    where: { id: body.jobId, userId: user.id },
    select: { id: true },
  })
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  try {
    const document =
      body.type === "cover_letter"
        ? await draftCoverLetter({ userId: user.id, jobId: job.id })
        : await draftTailoredResume({ userId: user.id, jobId: job.id })

    return NextResponse.json({ document })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate document"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
