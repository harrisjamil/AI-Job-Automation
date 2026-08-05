import { NextResponse } from "next/server"
import { createNotification } from "@/lib/notifications"
import { runJobCrawl } from "@/lib/jobs/ingest"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export const maxDuration = 300

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const crawlRun = await runJobCrawl(user.id)
    await prisma.jobPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        lastScheduledAt: new Date(),
        lastCrawlError: null,
        lastCrawlFailedAt: null,
      },
      update: {
        lastScheduledAt: new Date(),
        lastCrawlError: null,
        lastCrawlFailedAt: null,
      },
    })
    return NextResponse.json({ ok: true, crawlRun })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Crawl failed"
    await prisma.jobPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        lastCrawlError: message,
        lastCrawlFailedAt: new Date(),
      },
      update: {
        lastCrawlError: message,
        lastCrawlFailedAt: new Date(),
      },
    })
    await createNotification({
      userId: user.id,
      type: "crawl_failed",
      title: "Manual crawl failed",
      body: message,
      href: "/admin/settings",
    })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
