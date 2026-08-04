import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [jobsCount, withContact, drafts, sent, latestCrawl] = await Promise.all([
    prisma.job.count({ where: { userId: user.id } }),
    prisma.job.count({
      where: { userId: user.id, contacts: { some: {} } },
    }),
    prisma.outreachEmail.count({
      where: { userId: user.id, status: "draft" },
    }),
    prisma.outreachEmail.count({
      where: { userId: user.id, status: "sent" },
    }),
    prisma.crawlRun.findFirst({
      where: { userId: user.id },
      orderBy: { startedAt: "desc" },
    }),
  ])

  const topJobs = await prisma.job.findMany({
    where: { userId: user.id },
    orderBy: { matchScore: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      company: true,
      matchScore: true,
      isRemote: true,
      source: true,
      _count: { select: { contacts: true } },
    },
  })

  return NextResponse.json({
    stats: {
      jobsCount,
      withContact,
      drafts,
      sent,
    },
    latestCrawl,
    topJobs,
  })
}
