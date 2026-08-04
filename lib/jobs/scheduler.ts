import { prisma } from "@/lib/prisma"
import { runJobCrawl } from "@/lib/jobs/ingest"

/**
 * Runs scheduled crawls for users who opted in via JobPreferences.
 * Intended to be called from /api/cron/crawl (Vercel cron or external scheduler).
 */
export async function runScheduledCrawls(options?: {
  limit?: number
  force?: boolean
}) {
  const limit = options?.limit ?? 20
  const now = Date.now()

  const prefs = await prisma.jobPreferences.findMany({
    where: {
      scheduledCrawlEnabled: true,
    },
    take: 200,
    orderBy: { lastScheduledAt: "asc" },
  })

  const due = prefs.filter((pref) => {
    if (options?.force) return true
    if (!pref.lastScheduledAt) return true
    const intervalMs = Math.max(pref.crawlIntervalHours, 1) * 60 * 60 * 1000
    return now - pref.lastScheduledAt.getTime() >= intervalMs
  }).slice(0, limit)

  const results: Array<{
    userId: string
    ok: boolean
    jobsFound?: number
    error?: string
  }> = []

  for (const pref of due) {
    try {
      const crawlRun = await runJobCrawl(pref.userId)
      await prisma.jobPreferences.update({
        where: { userId: pref.userId },
        data: { lastScheduledAt: new Date() },
      })
      results.push({
        userId: pref.userId,
        ok: true,
        jobsFound: crawlRun.jobsFound,
      })
    } catch (error) {
      results.push({
        userId: pref.userId,
        ok: false,
        error: error instanceof Error ? error.message : "Scheduled crawl failed",
      })
    }
  }

  return {
    checked: prefs.length,
    due: due.length,
    ran: results.length,
    results,
  }
}
