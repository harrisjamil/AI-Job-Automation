import { NextResponse } from "next/server"
import { isApplicationStatus } from "@/lib/applications"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.jobApplication.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    status?: string
    notes?: string
    followUpAt?: string | null
  }

  const data: {
    status?: string
    notes?: string | null
    followUpAt?: Date | null
    followUpRemindedAt?: Date | null
    appliedAt?: Date | null
    statusChangedAt?: Date
  } = {}

  if (body.status) {
    if (!isApplicationStatus(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    data.status = body.status
    data.statusChangedAt = new Date()
    if (body.status === "applied" && !existing.appliedAt) {
      data.appliedAt = new Date()
    }
  }

  if (typeof body.notes === "string") {
    data.notes = body.notes.trim() || null
  }

  if (body.followUpAt === null) {
    data.followUpAt = null
    data.followUpRemindedAt = null
  } else if (typeof body.followUpAt === "string") {
    data.followUpAt = new Date(body.followUpAt)
    data.followUpRemindedAt = null
  }

  const application = await prisma.jobApplication.update({
    where: { id },
    data,
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const existing = await prisma.jobApplication.findFirst({
    where: { id, userId: user.id },
  })

  if (!existing) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 })
  }

  await prisma.jobApplication.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
