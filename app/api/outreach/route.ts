import { NextResponse } from "next/server"
import { draftOutreachEmail } from "@/lib/email/draft"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")?.trim() ?? ""

  const emails = await prisma.outreachEmail.findMany({
    where: {
      userId: user.id,
      ...(status ? { status } : {}),
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          url: true,
          matchScore: true,
          isRemote: true,
        },
      },
      contact: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  return NextResponse.json({ emails })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    jobId?: string
    contactId?: string
    toEmail?: string
    subject?: string
    body?: string
  }

  if (!body.jobId) {
    return NextResponse.json({ error: "jobId is required" }, { status: 400 })
  }

  const job = await prisma.job.findFirst({
    where: { id: body.jobId, userId: user.id },
    include: {
      contacts: { orderBy: { confidence: "desc" }, take: 1 },
    },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  const contact =
    body.contactId
      ? await prisma.jobContact.findFirst({
          where: { id: body.contactId, jobId: job.id },
        })
      : job.contacts[0] ?? null

  const toEmail = (body.toEmail || contact?.email || "").trim().toLowerCase()
  if (!toEmail) {
    return NextResponse.json(
      { error: "toEmail is required (or enrich contacts first)" },
      { status: 400 }
    )
  }

  // If subject/body provided, save custom draft; else AI-generate
  if (body.subject && body.body) {
    const email = await prisma.outreachEmail.create({
      data: {
        userId: user.id,
        jobId: job.id,
        contactId: contact?.id ?? null,
        toEmail,
        subject: body.subject.slice(0, 200),
        body: body.body.slice(0, 5000),
        status: "draft",
      },
    })
    return NextResponse.json({ email })
  }

  try {
    const email = await draftOutreachEmail({
      userId: user.id,
      jobId: job.id,
      contactId: contact?.id,
      toEmail,
    })
    return NextResponse.json({ email })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to draft email"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
