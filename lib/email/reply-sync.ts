import { ImapFlow } from "imapflow"
import { decryptSecret } from "@/lib/crypto/secrets"
import { createNotification } from "@/lib/notifications"
import { sendSlackWebhook } from "@/lib/alerts/slack"
import { prisma } from "@/lib/prisma"

type SyncResult = {
  userId: string
  scanned: number
  matched: number
  updated: number
  error?: string
}

/**
 * Scan the user's IMAP inbox for replies matching outbound outreach,
 * then update application replyStatus automatically.
 */
export async function syncRepliesForUser(userId: string): Promise<SyncResult> {
  const account = await prisma.emailAccount.findUnique({
    where: { userId },
  })

  if (!account?.replySyncEnabled) {
    return {
      userId,
      scanned: 0,
      matched: 0,
      updated: 0,
      error: "reply_sync_disabled",
    }
  }

  const host = account.imapHost?.trim()
  const user = account.imapUser?.trim() || account.smtpUser?.trim()
  const pass = decryptSecret(account.imapPass) || decryptSecret(account.smtpPass)
  const port = account.imapPort || 993
  const secure = account.imapSecure ?? true

  if (!host || !user || !pass) {
    return {
      userId,
      scanned: 0,
      matched: 0,
      updated: 0,
      error: "imap_not_configured",
    }
  }

  const awaiting = await prisma.jobApplication.findMany({
    where: {
      userId,
      replyStatus: { in: ["none", "awaiting"] },
      OR: [
        { status: { in: ["outreach", "applied", "interview"] } },
        { outreachFollowUpCount: { gt: 0 } },
      ],
    },
    select: {
      id: true,
      jobId: true,
      job: { select: { title: true, company: true } },
    },
    take: 100,
  })

  const outreach = await prisma.outreachEmail.findMany({
    where: {
      userId,
      status: "sent",
      jobId: { in: awaiting.map((a) => a.jobId) },
    },
    select: {
      jobId: true,
      toEmail: true,
      subject: true,
      sentAt: true,
    },
  })

  if (awaiting.length === 0 || outreach.length === 0) {
    await prisma.emailAccount.update({
      where: { userId },
      data: { lastReplySyncAt: new Date() },
    })
    return { userId, scanned: 0, matched: 0, updated: 0 }
  }

  const byJob = new Map(awaiting.map((a) => [a.jobId, a]))
  const client = new ImapFlow({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: false,
  })

  let scanned = 0
  let matched = 0
  let updated = 0

  try {
    await client.connect()
    const lock = await client.getMailboxLock("INBOX")
    try {
      const since = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000)
      for await (const msg of client.fetch(
        { seen: false, since },
        { envelope: true, source: false }
      )) {
        scanned += 1
        const fromAddrs = (msg.envelope?.from ?? [])
          .map((f) => f.address?.toLowerCase())
          .filter(Boolean) as string[]
        const subject = (msg.envelope?.subject ?? "").toLowerCase()

        for (const out of outreach) {
          const to = out.toEmail.toLowerCase()
          if (!fromAddrs.includes(to)) continue

          const subjectHint = out.subject.toLowerCase().slice(0, 40)
          const looksLikeReply =
            subject.includes("re:") ||
            (subjectHint.length > 8 && subject.includes(subjectHint))

          if (!looksLikeReply && !fromAddrs.includes(to)) continue

          const app = byJob.get(out.jobId)
          if (!app) continue

          matched += 1
          await prisma.jobApplication.update({
            where: { id: app.id },
            data: {
              replyStatus: "replied",
              lastReplyAt: new Date(),
            },
          })
          updated += 1

          const label = `${app.job.title}${app.job.company ? ` @ ${app.job.company}` : ""}`
          await createNotification({
            userId,
            type: "reply_detected",
            title: `Reply detected: ${label}`,
            body: `Inbox matched a reply from ${out.toEmail}`,
            href: "/admin/applications",
          })

          const prefs = await prisma.jobPreferences.findUnique({
            where: { userId },
            select: { slackWebhookUrl: true },
          })
          await sendSlackWebhook(
            prefs?.slackWebhookUrl,
            `Reply detected for *${label}* from ${out.toEmail}`
          )
        }
      }
    } finally {
      lock.release()
    }
  } catch (error) {
    return {
      userId,
      scanned,
      matched,
      updated,
      error: error instanceof Error ? error.message : "IMAP sync failed",
    }
  } finally {
    try {
      await client.logout()
    } catch {
      // ignore logout errors
    }
  }

  await prisma.emailAccount.update({
    where: { userId },
    data: { lastReplySyncAt: new Date() },
  })

  return { userId, scanned, matched, updated }
}

export async function syncRepliesForAllUsers(options?: { limit?: number }) {
  const accounts = await prisma.emailAccount.findMany({
    where: { replySyncEnabled: true },
    take: options?.limit ?? 30,
    orderBy: { lastReplySyncAt: "asc" },
  })

  const results: SyncResult[] = []
  for (const account of accounts) {
    results.push(await syncRepliesForUser(account.userId))
  }

  return {
    checked: accounts.length,
    results,
    updated: results.reduce((sum, r) => sum + r.updated, 0),
  }
}
