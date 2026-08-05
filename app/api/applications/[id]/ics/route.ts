import { NextResponse } from "next/server"
import { buildInterviewIcs } from "@/lib/email/interview-reminders"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const application = await prisma.jobApplication.findFirst({
    where: { id, userId: user.id },
    include: {
      job: { select: { title: true, company: true, url: true } },
    },
  })

  if (!application?.interviewAt) {
    return NextResponse.json(
      { error: "No interview date set on this application" },
      { status: 400 }
    )
  }

  const ics = buildInterviewIcs({
    title: application.job.title,
    company: application.job.company,
    interviewAt: application.interviewAt,
    url: application.job.url,
    uid: application.id,
  })

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="interview-${application.id}.ics"`,
    },
  })
}
