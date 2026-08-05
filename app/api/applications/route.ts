import { NextResponse } from "next/server"
import {
  APPLICATION_STATUSES,
  isApplicationStatus,
} from "@/lib/applications"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  const applications = await prisma.jobApplication.findMany({
    where: {
      userId: user.id,
      ...(status && isApplicationStatus(status) ? { status } : {}),
    },
    orderBy: [{ followUpAt: "asc" }, { updatedAt: "desc" }],
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          url: true,
          matchScore: true,
          isRemote: true,
          source: true,
          salary: true,
          postedAt: true,
        },
      },
    },
  })

  const counts = await prisma.jobApplication.groupBy({
    by: ["status"],
    where: { userId: user.id },
    _count: { _all: true },
  })

  const statusCounts = Object.fromEntries(
    APPLICATION_STATUSES.map((key) => [key, 0])
  ) as Record<string, number>

  for (const row of counts) {
    statusCounts[row.status] = row._count._all
  }

  return NextResponse.json({
    applications: applications.map((app) => ({
      ...app,
      replyStatus: app.replyStatus,
      interviewAt: app.interviewAt,
      autoApplyStatus: app.autoApplyStatus,
      applyPackageJson: app.applyPackageJson,
      autoPreparedAt: app.autoPreparedAt,
      outreachFollowUpCount: app.outreachFollowUpCount,
    })),
    statusCounts,
  })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string
    status?: string
    notes?: string
    followUpAt?: string | null
  }

  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }

  const job = await prisma.job.findFirst({
    where: { id: body.jobId, userId: user.id },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const status =
    body.status && isApplicationStatus(body.status) ? body.status : "saved"

  const followUpAt =
    body.followUpAt === null
      ? null
      : body.followUpAt
        ? new Date(body.followUpAt)
        : undefined

  const application = await prisma.jobApplication.upsert({
    where: { jobId: job.id },
    create: {
      userId: user.id,
      jobId: job.id,
      status,
      notes: body.notes?.trim() || null,
      followUpAt: followUpAt ?? null,
      appliedAt: status === "applied" ? new Date() : null,
      statusChangedAt: new Date(),
    },
    update: {
      status,
      ...(typeof body.notes === "string"
        ? { notes: body.notes.trim() || null }
        : {}),
      ...(followUpAt !== undefined ? { followUpAt } : {}),
      ...(status === "applied" ? { appliedAt: new Date() } : {}),
      statusChangedAt: new Date(),
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          location: true,
          url: true,
          matchScore: true,
          isRemote: true,
          source: true,
          salary: true,
          postedAt: true,
        },
      },
    },
  })

  return NextResponse.json({ application })
}
