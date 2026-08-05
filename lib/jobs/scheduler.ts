import { sendSlackWebhook } from "@/lib/alerts/slack"
import { createNotification } from "@/lib/notifications"
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
        data: {
          lastScheduledAt: new Date(),
          lastCrawlError: null,
          lastCrawlFailedAt: null,
        },
      })
      results.push({
        userId: pref.userId,
        ok: true,
        jobsFound: crawlRun.jobsFound,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scheduled crawl failed"
      await prisma.jobPreferences.update({
        where: { userId: pref.userId },
        data: {
          lastCrawlError: message,
          lastCrawlFailedAt: new Date(),
        },
      })
      await createNotification({
        userId: pref.userId,
        type: "crawl_failed",
        title: "Scheduled crawl failed",
        body: message,
        href: "/admin/settings",
      })
      await sendSlackWebhook(
        pref.slackWebhookUrl,
        `Crawl failed: ${message}`
      )
      results.push({
        userId: pref.userId,
        ok: false,
        error: message,
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

/** Crawl health snapshot for Settings UI. */
export async function getCrawlHealth(userId: string) {
  const [prefs, lastRun, lastFailed, recentRuns] = await Promise.all([
    prisma.jobPreferences.findUnique({ where: { userId } }),
    prisma.crawlRun.findFirst({
      where: { userId },
      orderBy: { startedAt: "desc" },
    }),
    prisma.crawlRun.findFirst({
      where: { userId, status: "failed" },
      orderBy: { startedAt: "desc" },
    }),
    prisma.crawlRun.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        jobsFound: true,
        startedAt: true,
        finishedAt: true,
        error: true,
        sources: true,
      },
    }),
  ])

  const intervalHours = prefs?.crawlIntervalHours ?? 6
  let nextScheduledAt: Date | null = null
  if (prefs?.scheduledCrawlEnabled) {
    const base = prefs.lastScheduledAt ?? lastRun?.startedAt ?? null
    nextScheduledAt = base
      ? new Date(base.getTime() + intervalHours * 60 * 60 * 1000)
      : new Date()
  }

  return {
    scheduledCrawlEnabled: prefs?.scheduledCrawlEnabled ?? false,
    crawlIntervalHours: intervalHours,
    lastScheduledAt: prefs?.lastScheduledAt ?? null,
    lastAlertedAt: prefs?.lastAlertedAt ?? null,
    lastCrawlError: prefs?.lastCrawlError ?? null,
    lastCrawlFailedAt: prefs?.lastCrawlFailedAt ?? null,
    nextScheduledAt,
    lastRun,
    lastFailed,
    recentRuns,
    cronHint:
      "Vercel cron hits /api/cron/crawl every 6 hours (see vercel.json). Protect with CRON_SECRET.",
  }
}
