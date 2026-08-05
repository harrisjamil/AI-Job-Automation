import { createNotification } from "@/lib/notifications"
import { sendSlackWebhook } from "@/lib/alerts/slack"
import { sendUserEmail } from "@/lib/email/send-user"
import { prisma } from "@/lib/prisma"

/**
 * Remind users about upcoming interviews (within 48h, not yet reminded).
 */
export async function sendInterviewReminders() {
  const now = new Date()
  const horizon = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const due = await prisma.jobApplication.findMany({
    where: {
      interviewAt: { gte: now, lte: horizon },
      interviewRemindedAt: null,
      status: { in: ["interview", "applied", "outreach"] },
    },
    include: {
      job: { select: { title: true, company: true, url: true } },
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          jobPreferences: {
            select: {
              interviewRemindersEnabled: true,
              slackWebhookUrl: true,
            },
          },
        },
      },
    },
    take: 100,
  })

  let sent = 0
  const results: Array<{ applicationId: string; ok: boolean; error?: string }> =
    []

  for (const app of due) {
    if (app.user.jobPreferences?.interviewRemindersEnabled === false) {
      continue
    }

    const label = `${app.job.title}${app.job.company ? ` @ ${app.job.company}` : ""}`
    const when = app.interviewAt!.toISOString()
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      "http://localhost:3000"

    try {
      await createNotification({
        userId: app.userId,
        type: "interview_reminder",
        title: `Interview soon: ${label}`,
        body: `Scheduled for ${when}`,
        href: "/admin/applications",
      })

      await sendSlackWebhook(
        app.user.jobPreferences?.slackWebhookUrl,
        `Interview reminder: *${label}* at ${when}\n${app.job.url}`
      )

      try {
        await sendUserEmail({
          userId: app.userId,
          to: app.user.email,
          subject: `Interview reminder: ${label}`,
          text: `Hi ${app.user.fullName.split(" ")[0] || "there"},

You have an interview coming up for ${label}.

When: ${when}
Posting: ${app.job.url}

Open tracker: ${appUrl}/admin/applications

— AI Job Automation`,
        })
      } catch {
        // Email optional if not configured
      }

      await prisma.jobApplication.update({
        where: { id: app.id },
        data: { interviewRemindedAt: new Date() },
      })

      sent += 1
      results.push({ applicationId: app.id, ok: true })
    } catch (error) {
      results.push({
        applicationId: app.id,
        ok: false,
        error: error instanceof Error ? error.message : "Failed",
      })
    }
  }

  return { checked: due.length, sent, results }
}

export function buildInterviewIcs(options: {
  title: string
  company: string | null
  interviewAt: Date
  url: string
  uid: string
}) {
  const dtStart = options.interviewAt
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
  const dtEnd = new Date(options.interviewAt.getTime() + 60 * 60 * 1000)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
  const summary = `Interview: ${options.title}${options.company ? ` @ ${options.company}` : ""}`
  const description = `Job posting: ${options.url}`.replace(/\n/g, "\\n")

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AI Job Automation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${options.uid}@ai-job-automation`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeIcs(summary)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
    `URL:${options.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
}
