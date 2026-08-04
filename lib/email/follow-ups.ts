import { prisma } from "@/lib/prisma"
import { sendUserEmail } from "@/lib/email/send-user"

const ACTIVE_STATUSES = ["saved", "outreach", "applied", "interview"] as const
const MAX_PER_USER = 20

/**
 * Email users about application follow-ups that are due today or overdue,
 * and have not yet been reminded for the current followUpAt date.
 */
export async function sendDueFollowUpReminders(options?: { limitUsers?: number }) {
  const limitUsers = options?.limitUsers ?? 50
  const endOfToday = new Date()
  endOfToday.setUTCHours(23, 59, 59, 999)

  const dueApps = await prisma.jobApplication.findMany({
    where: {
      followUpAt: { lte: endOfToday, not: null },
      status: { in: [...ACTIVE_STATUSES] },
      user: {
        OR: [
          { jobPreferences: null },
          { jobPreferences: { followUpRemindersEnabled: true } },
        ],
      },
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          url: true,
          matchScore: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          jobPreferences: {
            select: { followUpRemindersEnabled: true },
          },
        },
      },
    },
    orderBy: { followUpAt: "asc" },
    take: 500,
  })

  const needsReminder = dueApps.filter((app) => {
    if (!app.followUpAt) return false
    if (app.user.jobPreferences?.followUpRemindersEnabled === false) {
      return false
    }
    if (!app.followUpRemindedAt) return true
    return app.followUpRemindedAt.getTime() < app.followUpAt.getTime()
  })

  const byUser = new Map<
    string,
    {
      email: string
      fullName: string
      apps: typeof needsReminder
    }
  >()

  for (const app of needsReminder) {
    const existing = byUser.get(app.userId)
    if (existing) {
      if (existing.apps.length < MAX_PER_USER) existing.apps.push(app)
    } else {
      byUser.set(app.userId, {
        email: app.user.email,
        fullName: app.user.fullName,
        apps: [app],
      })
    }
  }

  const userIds = [...byUser.keys()].slice(0, limitUsers)
  const results: Array<{
    userId: string
    ok: boolean
    count?: number
    error?: string
  }> = []

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "http://localhost:3000"

  for (const userId of userIds) {
    const bundle = byUser.get(userId)
    if (!bundle || bundle.apps.length === 0) continue

    const lines = bundle.apps.map((app, index) => {
      const due = app.followUpAt
        ? app.followUpAt.toISOString().slice(0, 10)
        : "n/a"
      return `${index + 1}. ${app.job.title}${app.job.company ? ` @ ${app.job.company}` : ""} — due ${due} (${app.status})\n   ${app.job.url}`
    })

    const subject = `${bundle.apps.length} application follow-up${bundle.apps.length === 1 ? "" : "s"} due`
    const text = `Hi ${bundle.fullName.split(" ")[0] || "there"},

You have ${bundle.apps.length} follow-up${bundle.apps.length === 1 ? "" : "s"} due:

${lines.join("\n\n")}

Open your tracker: ${appUrl}/admin/applications

— AI Job Automation`

    const html = `
      <p>Hi ${escapeHtml(bundle.fullName.split(" ")[0] || "there")},</p>
      <p>You have <strong>${bundle.apps.length}</strong> follow-up${bundle.apps.length === 1 ? "" : "s"} due:</p>
      <ol>
        ${bundle.apps
          .map((app) => {
            const due = app.followUpAt
              ? app.followUpAt.toISOString().slice(0, 10)
              : "n/a"
            return `
          <li style="margin-bottom:12px">
            <a href="${escapeHtml(app.job.url)}">${escapeHtml(app.job.title)}</a>
            ${app.job.company ? ` @ ${escapeHtml(app.job.company)}` : ""}
            · due <strong>${escapeHtml(due)}</strong>
            · ${escapeHtml(app.status)}
            ${app.notes ? `<br/><span style="color:#666">${escapeHtml(app.notes.slice(0, 160))}</span>` : ""}
          </li>`
          })
          .join("")}
      </ol>
      <p><a href="${escapeHtml(appUrl)}/admin/applications">Open Applications</a></p>
      <p style="color:#666;font-size:12px">AI Job Automation</p>
    `

    try {
      await sendUserEmail({
        userId,
        to: bundle.email,
        subject,
        text,
        html,
      })

      const now = new Date()
      await prisma.jobApplication.updateMany({
        where: { id: { in: bundle.apps.map((app) => app.id) } },
        data: { followUpRemindedAt: now },
      })

      results.push({ userId, ok: true, count: bundle.apps.length })
    } catch (error) {
      results.push({
        userId,
        ok: false,
        error: error instanceof Error ? error.message : "Send failed",
      })
    }
  }

  return {
    checked: dueApps.length,
    due: needsReminder.length,
    users: userIds.length,
    results,
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
