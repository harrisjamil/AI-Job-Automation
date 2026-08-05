import { NextResponse } from "next/server"
import { Prisma } from "@/generated/prisma/client"
import { MIN_MATCH_SCORE } from "@/lib/jobs/match"
import { MAX_JOB_AGE_DAYS } from "@/lib/jobs/relevance"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim() ?? ""
  const remote = searchParams.get("remote") === "1"
  const hasContact = searchParams.get("hasContact") === "1"
  const category = searchParams.get("category")?.trim()
  const includeStale = searchParams.get("includeStale") === "1"
  const includeApplied = searchParams.get("includeApplied") === "1"
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit") ?? 80) || 80, 1),
    200
  )

  const staleCutoff = new Date(
    Date.now() - MAX_JOB_AGE_DAYS * 24 * 60 * 60 * 1000
  )
  const undatedCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

  const andFilters: Prisma.JobWhereInput[] = []

  if (!includeApplied) {
    andFilters.push({
      OR: [
        { application: null },
        {
          application: {
            status: { in: ["saved", "outreach"] },
          },
        },
      ],
    })
  }

  if (!includeStale) {
    andFilters.push({
      OR: [
        { postedAt: { gte: staleCutoff } },
        {
          AND: [{ postedAt: null }, { scrapedAt: { gte: undatedCutoff } }],
        },
      ],
    })
  }

  if (q) {
    andFilters.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { location: { contains: q, mode: "insensitive" } },
        { source: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ],
    })
  }

  const where: Prisma.JobWhereInput = {
    userId: user.id,
    matchScore: { gte: MIN_MATCH_SCORE },
    ...(remote ? { isRemote: true } : {}),
    ...(category ? { sourceCategory: category } : {}),
    ...(hasContact ? { contacts: { some: {} } } : {}),
    ...(andFilters.length ? { AND: andFilters } : {}),
  }

  const jobs = await prisma.job.findMany({
    where,
    orderBy: [{ matchScore: "desc" }, { postedAt: "desc" }, { scrapedAt: "desc" }],
    take: limit,
    include: {
      contacts: {
        orderBy: { confidence: "desc" },
        take: 3,
        select: {
          id: true,
          email: true,
          name: true,
          confidence: true,
        },
      },
      _count: {
        select: {
          contacts: true,
          outreachEmails: true,
        },
      },
    },
  })

  return NextResponse.json({ jobs })
}
