import { prisma } from "@/lib/prisma"

export async function getAnalyticsSummary(userId: string) {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    jobsTotal,
    apps,
    outreachSent,
    outreachDrafts,
    replied,
    awaiting,
    appliedThisWeek,
    appliedThisMonth,
    topSources,
    avgMatchApplied,
    readyPackages,
    interviews,
  ] = await Promise.all([
    prisma.job.count({ where: { userId } }),
    prisma.jobApplication.groupBy({
      by: ["status"],
      where: { userId },
      _count: { _all: true },
    }),
    prisma.outreachEmail.count({ where: { userId, status: "sent" } }),
    prisma.outreachEmail.count({ where: { userId, status: "draft" } }),
    prisma.jobApplication.count({
      where: { userId, replyStatus: "replied" },
    }),
    prisma.jobApplication.count({
      where: { userId, replyStatus: "awaiting" },
    }),
    prisma.jobApplication.count({
      where: { userId, appliedAt: { gte: weekAgo } },
    }),
    prisma.jobApplication.count({
      where: { userId, appliedAt: { gte: monthAgo } },
    }),
    prisma.job.groupBy({
      by: ["source"],
      where: { userId },
      _count: { _all: true },
      _avg: { matchScore: true },
      orderBy: { _count: { source: "desc" } },
      take: 8,
    }),
    prisma.jobApplication.findMany({
      where: { userId, status: { in: ["applied", "interview", "offer"] } },
      select: { job: { select: { matchScore: true } } },
      take: 500,
    }),
    prisma.jobApplication.count({
      where: {
        userId,
        autoApplyStatus: { in: ["ready", "submitted"] },
      },
    }),
    prisma.jobApplication.count({
      where: { userId, status: "interview" },
    }),
  ])

  const statusCounts = Object.fromEntries(
    apps.map((row) => [row.status, row._count._all])
  )
  const appliedCount = (statusCounts.applied ?? 0) + (statusCounts.interview ?? 0) + (statusCounts.offer ?? 0)
  const responseRate =
    outreachSent > 0 ? Math.round((replied / outreachSent) * 1000) / 10 : 0

  const matchScores = avgMatchApplied
    .map((row) => row.job.matchScore)
    .filter((n) => typeof n === "number")
  const avgMatch =
    matchScores.length > 0
      ? Math.round(
          (matchScores.reduce((a, b) => a + b, 0) / matchScores.length) * 10
        ) / 10
      : null

  return {
    jobsTotal,
    statusCounts,
    outreachSent,
    outreachDrafts,
    replied,
    awaiting,
    appliedThisWeek,
    appliedThisMonth,
    appliedCount,
    responseRate,
    avgMatchOfApplied: avgMatch,
    readyPackages,
    interviews,
    topSources: topSources.map((row) => ({
      source: row.source,
      jobs: row._count._all,
      avgMatch: row._avg.matchScore
        ? Math.round(row._avg.matchScore * 10) / 10
        : null,
    })),
  }
}
