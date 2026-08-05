import { prisma } from "@/lib/prisma"
import { sendUserEmail } from "@/lib/email/send-user"
import { draftOutreachEmail } from "@/lib/email/draft"
import { sendOutreachEmail } from "@/lib/email/send"

/**
 * For applications in outreach/applied with awaiting reply:
 * send scheduled follow-up emails at day 3 and day 7 after applied/outreach.
 */
export async function sendOutreachFollowUpSequence(options?: {
  limit?: number
}) {
  const limit = options?.limit ?? 30
  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  const apps = await prisma.jobApplication.findMany({
    where: {
      status: { in: ["outreach", "applied"] },
      replyStatus: { in: ["none", "awaiting"] },
      outreachFollowUpCount: { lt: 2 },
      OR: [{ appliedAt: { not: null } }, { status: "outreach" }],
    },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          company: true,
          url: true,
          contacts: {
            orderBy: { confidence: "desc" },
            take: 1,
          },
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
    take: 200,
    orderBy: { updatedAt: "asc" },
  })

  const due = apps
    .filter((app) => {
      if (app.user.jobPreferences?.followUpRemindersEnabled === false) {
        return false
      }
      const anchor = app.appliedAt ?? app.statusChangedAt
      const elapsed = now - anchor.getTime()
      const count = app.outreachFollowUpCount
      if (count === 0 && elapsed >= 3 * dayMs) return true
      if (count === 1 && elapsed >= 7 * dayMs) return true
      return false
    })
    .slice(0, limit)

  const results: Array<{
    applicationId: string
    ok: boolean
    error?: string
  }> = []

  for (const app of due) {
    try {
      const contact = app.job.contacts[0]
      const toEmail = contact?.email
      if (!toEmail) {
        // Digest to user instead of recruiter when no contact
        await sendUserEmail({
          userId: app.userId,
          to: app.user.email,
          subject: `Follow up on ${app.job.title}${app.job.company ? ` @ ${app.job.company}` : ""}`,
          text: `Hi ${app.user.fullName.split(" ")[0] || "there"},

It's time to follow up on ${app.job.title}${app.job.company ? ` at ${app.job.company}` : ""}.

Open the posting: ${app.job.url}

— AI Job Automation`,
        })
      } else {
        const draft = await draftOutreachEmail({
          userId: app.userId,
          jobId: app.jobId,
          contactId: contact.id,
          toEmail,
        })
        // Soften into a follow-up
        await prisma.outreachEmail.update({
          where: { id: draft.id },
          data: {
            subject: `Following up — ${app.job.title}`,
            body:
              `Hi${contact.name ? ` ${contact.name}` : ""},\n\n` +
              `I wanted to quickly follow up on my interest in the ${app.job.title} role` +
              `${app.job.company ? ` at ${app.job.company}` : ""}. ` +
              `Happy to share more detail or jump on a short call if useful.\n\n` +
              `Best regards`,
          },
        })
        await sendOutreachEmail(draft.id, app.userId)
      }

      await prisma.jobApplication.update({
        where: { id: app.id },
        data: {
          outreachFollowUpCount: { increment: 1 },
          lastOutreachFollowUpAt: new Date(),
          replyStatus:
            app.replyStatus === "none" ? "awaiting" : app.replyStatus,
          followUpAt: new Date(now + 4 * dayMs),
          followUpRemindedAt: null,
        },
      })

      results.push({ applicationId: app.id, ok: true })
    } catch (error) {
      results.push({
        applicationId: app.id,
        ok: false,
        error: error instanceof Error ? error.message : "Failed",
      })
    }
  }

  return {
    checked: apps.length,
    due: due.length,
    sent: results.filter((r) => r.ok).length,
    results,
  }
}
