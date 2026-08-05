import { prisma } from "@/lib/prisma"

export type NotificationType =
  | "high_score_jobs"
  | "crawl_failed"
  | "interview_reminder"
  | "reply_detected"
  | "follow_up"
  | "system"

export async function createNotification(options: {
  userId: string
  type: NotificationType
  title: string
  body?: string
  href?: string
}) {
  const prefs = await prisma.jobPreferences.findUnique({
    where: { userId: options.userId },
    select: { inAppAlertsEnabled: true },
  })

  if (prefs && prefs.inAppAlertsEnabled === false) {
    return null
  }

  return prisma.appNotification.create({
    data: {
      userId: options.userId,
      type: options.type,
      title: options.title,
      body: options.body ?? null,
      href: options.href ?? null,
    },
  })
}

export async function listNotifications(userId: string, limit = 30) {
  return prisma.appNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 50),
  })
}

export async function unreadNotificationCount(userId: string) {
  return prisma.appNotification.count({
    where: { userId, readAt: null },
  })
}

export async function markNotificationsRead(
  userId: string,
  ids?: string[]
) {
  if (ids?.length) {
    await prisma.appNotification.updateMany({
      where: { userId, id: { in: ids }, readAt: null },
      data: { readAt: new Date() },
    })
    return
  }

  await prisma.appNotification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}
