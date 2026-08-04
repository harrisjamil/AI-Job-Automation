import { prisma } from "@/lib/prisma"
import { sendUserEmail } from "@/lib/email/send-user"

const DEFAULT_ALERT_MIN_SCORE = 55
const MAX_ALERT_JOBS = 15

/**
 * After a crawl, email the user a digest of new high-score jobs
 * that have not been alerted yet.
 */
export async function sendHighScoreJobAlerts(
  userId: string,
  crawlRunId: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      fullName: true,
      jobPreferences: {
        select: {
          alertsEnabled: true,
          alertMinScore: true,
        },
      },
    },
  })

  if (!user) return { sent: false, reason: "user_missing" as const }

  const prefs = user.jobPreferences
  if (prefs && prefs.alertsEnabled === false) {
    return { sent: false, reason: "alerts_disabled" as const }
  }

  const minScore = prefs?.alertMinScore ?? DEFAULT_ALERT_MIN_SCORE

  const jobs = await prisma.job.findMany({
    where: {
      userId,
      crawlRunId,
      matchScore: { gte: minScore },
      alertedAt: null,
    },
    orderBy: { matchScore: "desc" },
    take: MAX_ALERT_JOBS,
    select: {
      id: true,
      title: true,
      company: true,
      location: true,
      matchScore: true,
      url: true,
      isRemote: true,
      salary: true,
      source: true,
    },
  })

  if (jobs.length === 0) {
    return { sent: false, reason: "no_jobs" as const, count: 0 }
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"

  const lines = jobs.map(
    (job, index) =>
      `${index + 1}. [${job.matchScore}] ${job.title}${job.company ? ` @ ${job.company}` : ""}${job.isRemote ? " (Remote)" : ""}\n   ${job.url}`
  )

  const subject = `${jobs.length} new high-match remote job${jobs.length === 1 ? "" : "s"} (score ≥ ${minScore})`
  const text = `Hi ${user.fullName.split(" ")[0] || "there"},

Your latest crawl found ${jobs.length} strong match${jobs.length === 1 ? "" : "es"}:

${lines.join("\n\n")}

Review them here: ${appUrl}/admin/jobs

— AI Job Automation`

  const html = `
    <p>Hi ${escapeHtml(user.fullName.split(" ")[0] || "there")},</p>
    <p>Your latest crawl found <strong>${jobs.length}</strong> strong match${jobs.length === 1 ? "" : "es"} (score ≥ ${minScore}):</p>
    <ol>
      ${jobs
        .map(
          (job) => `
        <li style="margin-bottom:12px">
          <strong>[${job.matchScore}]</strong>
          <a href="${escapeHtml(job.url)}">${escapeHtml(job.title)}</a>
          ${job.company ? ` @ ${escapeHtml(job.company)}` : ""}
          ${job.isRemote ? " · Remote" : ""}
          ${job.salary ? ` · ${escapeHtml(job.salary)}` : ""}
        </li>`
        )
        .join("")}
    </ol>
    <p><a href="${escapeHtml(appUrl)}/admin/jobs">Open Discover Jobs</a></p>
    <p style="color:#666;font-size:12px">AI Job Automation</p>
  `

  try {
    await sendUserEmail({
      userId,
      to: user.email,
      subject,
      text,
      html,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send alert email"
    console.error("High-score alert failed:", message)
    return { sent: false, reason: "send_failed" as const, error: message }
  }

  const now = new Date()
  await prisma.$transaction([
    prisma.job.updateMany({
      where: { id: { in: jobs.map((job) => job.id) } },
      data: { alertedAt: now },
    }),
    prisma.jobPreferences.upsert({
      where: { userId },
      create: {
        userId,
        alertsEnabled: true,
        alertMinScore: minScore,
        lastAlertedAt: now,
      },
      update: { lastAlertedAt: now },
    }),
  ])

  return { sent: true as const, count: jobs.length }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
