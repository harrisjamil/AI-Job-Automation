import { NextResponse } from "next/server"
import { encryptSecret } from "@/lib/crypto/secrets"
import { serializeEmailAccount } from "@/lib/email/send"
import { getCrawlHealth } from "@/lib/jobs/scheduler"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/session"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const account = await prisma.emailAccount.findUnique({
    where: { userId: user.id },
  })

  const prefs = await prisma.jobPreferences.findUnique({
    where: { userId: user.id },
  })

  const health = await getCrawlHealth(user.id)

  return NextResponse.json({
    emailAccount: serializeEmailAccount(account),
    crawlDefaults: {
      remoteOnly: prefs?.remoteOnly ?? true,
      scheduledCrawlEnabled: prefs?.scheduledCrawlEnabled ?? false,
      crawlIntervalHours: prefs?.crawlIntervalHours ?? 6,
      excludeKeywords: prefs?.excludeKeywords ?? [],
      includeKeywords: prefs?.includeKeywords ?? [],
      targetRoles: prefs?.targetRoles ?? [],
      alertsEnabled: prefs?.alertsEnabled ?? true,
      alertMinScore: prefs?.alertMinScore ?? 55,
      lastAlertedAt: prefs?.lastAlertedAt ?? null,
      followUpRemindersEnabled: prefs?.followUpRemindersEnabled ?? true,
      autoApplyEnabled: prefs?.autoApplyEnabled ?? false,
      autoApplyMinScore: prefs?.autoApplyMinScore ?? 70,
      autoApplyMarkApplied: prefs?.autoApplyMarkApplied ?? true,
      autoApplyFollowUpDays: prefs?.autoApplyFollowUpDays ?? 7,
      slackWebhookUrl: prefs?.slackWebhookUrl ?? "",
      inAppAlertsEnabled: prefs?.inAppAlertsEnabled ?? true,
      interviewRemindersEnabled: prefs?.interviewRemindersEnabled ?? true,
    },
    crawlHealth: health,
    envHints: {
      hasResendEnv: Boolean(process.env.RESEND_API_KEY),
      hasSmtpEnv: Boolean(process.env.SMTP_HOST),
      hasAdzunaEnv: Boolean(
        process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY
      ),
      hasCronSecret: Boolean(process.env.CRON_SECRET),
    },
  })
}

export async function PUT(request: Request) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    emailAccount?: {
      provider?: string
      fromEmail?: string
      fromName?: string
      apiKey?: string
      smtpHost?: string
      smtpPort?: number | string
      smtpUser?: string
      smtpPass?: string
      smtpSecure?: boolean
      isActive?: boolean
      clearApiKey?: boolean
      clearSmtpPass?: boolean
      imapHost?: string
      imapPort?: number | string
      imapUser?: string
      imapPass?: string
      imapSecure?: boolean
      replySyncEnabled?: boolean
      clearImapPass?: boolean
    }
    crawlDefaults?: {
      remoteOnly?: boolean
      scheduledCrawlEnabled?: boolean
      crawlIntervalHours?: number
      alertsEnabled?: boolean
      alertMinScore?: number
      followUpRemindersEnabled?: boolean
      autoApplyEnabled?: boolean
      autoApplyMinScore?: number
      autoApplyMarkApplied?: boolean
      autoApplyFollowUpDays?: number
      slackWebhookUrl?: string | null
      inAppAlertsEnabled?: boolean
      interviewRemindersEnabled?: boolean
    }
  }

  const existing = await prisma.emailAccount.findUnique({
    where: { userId: user.id },
  })

  let emailAccount = existing

  if (body.emailAccount) {
    const ea = body.emailAccount
    const provider = (ea.provider || existing?.provider || "resend").trim()
    const fromEmail = (ea.fromEmail || existing?.fromEmail || "").trim()

    if (!fromEmail) {
      return NextResponse.json(
        { error: "fromEmail is required for email account" },
        { status: 400 }
      )
    }

    if (provider !== "resend" && provider !== "smtp") {
      return NextResponse.json(
        { error: "provider must be resend or smtp" },
        { status: 400 }
      )
    }

    const apiKey = ea.clearApiKey
      ? null
      : ea.apiKey?.trim()
        ? encryptSecret(ea.apiKey.trim())
        : existing?.apiKey
    const smtpPass = ea.clearSmtpPass
      ? null
      : ea.smtpPass?.trim()
        ? encryptSecret(ea.smtpPass.trim())
        : existing?.smtpPass
    const imapPass = ea.clearImapPass
      ? null
      : ea.imapPass?.trim()
        ? encryptSecret(ea.imapPass.trim())
        : existing?.imapPass

    emailAccount = await prisma.emailAccount.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        provider,
        fromEmail,
        fromName: ea.fromName?.trim() || null,
        apiKey: apiKey ?? null,
        smtpHost: ea.smtpHost?.trim() || null,
        smtpPort: ea.smtpPort ? Number(ea.smtpPort) : null,
        smtpUser: ea.smtpUser?.trim() || null,
        smtpPass: smtpPass ?? null,
        smtpSecure: ea.smtpSecure ?? true,
        isActive: ea.isActive ?? true,
        imapHost: ea.imapHost?.trim() || null,
        imapPort: ea.imapPort ? Number(ea.imapPort) : null,
        imapUser: ea.imapUser?.trim() || null,
        imapPass: imapPass ?? null,
        imapSecure: ea.imapSecure ?? true,
        replySyncEnabled: ea.replySyncEnabled ?? false,
      },
      update: {
        provider,
        fromEmail,
        fromName: ea.fromName?.trim() || null,
        apiKey: apiKey ?? null,
        smtpHost: ea.smtpHost?.trim() || null,
        smtpPort: ea.smtpPort ? Number(ea.smtpPort) : null,
        smtpUser: ea.smtpUser?.trim() || null,
        smtpPass: smtpPass ?? null,
        smtpSecure: ea.smtpSecure ?? true,
        isActive: ea.isActive ?? true,
        ...(ea.imapHost !== undefined
          ? { imapHost: ea.imapHost?.trim() || null }
          : {}),
        ...(ea.imapPort !== undefined
          ? { imapPort: ea.imapPort ? Number(ea.imapPort) : null }
          : {}),
        ...(ea.imapUser !== undefined
          ? { imapUser: ea.imapUser?.trim() || null }
          : {}),
        ...(ea.imapPass !== undefined || ea.clearImapPass
          ? { imapPass: imapPass ?? null }
          : {}),
        ...(typeof ea.imapSecure === "boolean"
          ? { imapSecure: ea.imapSecure }
          : {}),
        ...(typeof ea.replySyncEnabled === "boolean"
          ? { replySyncEnabled: ea.replySyncEnabled }
          : {}),
      },
    })
  }

  if (body.crawlDefaults) {
    const cd = body.crawlDefaults
    await prisma.jobPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        remoteOnly: cd.remoteOnly ?? true,
        scheduledCrawlEnabled: cd.scheduledCrawlEnabled ?? false,
        crawlIntervalHours: cd.crawlIntervalHours ?? 6,
        alertsEnabled: cd.alertsEnabled ?? true,
        alertMinScore: cd.alertMinScore ?? 55,
        followUpRemindersEnabled: cd.followUpRemindersEnabled ?? true,
        autoApplyEnabled: cd.autoApplyEnabled ?? false,
        autoApplyMinScore: cd.autoApplyMinScore ?? 70,
        autoApplyMarkApplied: cd.autoApplyMarkApplied ?? true,
        autoApplyFollowUpDays: cd.autoApplyFollowUpDays ?? 7,
        slackWebhookUrl: cd.slackWebhookUrl?.trim() || null,
        inAppAlertsEnabled: cd.inAppAlertsEnabled ?? true,
        interviewRemindersEnabled: cd.interviewRemindersEnabled ?? true,
      },
      update: {
        ...(typeof cd.remoteOnly === "boolean"
          ? { remoteOnly: cd.remoteOnly }
          : {}),
        ...(typeof cd.scheduledCrawlEnabled === "boolean"
          ? { scheduledCrawlEnabled: cd.scheduledCrawlEnabled }
          : {}),
        ...(typeof cd.crawlIntervalHours === "number"
          ? {
              crawlIntervalHours: Math.max(
                1,
                Math.min(168, cd.crawlIntervalHours)
              ),
            }
          : {}),
        ...(typeof cd.alertsEnabled === "boolean"
          ? { alertsEnabled: cd.alertsEnabled }
          : {}),
        ...(typeof cd.alertMinScore === "number"
          ? {
              alertMinScore: Math.max(
                28,
                Math.min(100, Math.round(cd.alertMinScore))
              ),
            }
          : {}),
        ...(typeof cd.followUpRemindersEnabled === "boolean"
          ? { followUpRemindersEnabled: cd.followUpRemindersEnabled }
          : {}),
        ...(typeof cd.autoApplyEnabled === "boolean"
          ? { autoApplyEnabled: cd.autoApplyEnabled }
          : {}),
        ...(typeof cd.autoApplyMinScore === "number"
          ? {
              autoApplyMinScore: Math.max(
                40,
                Math.min(100, Math.round(cd.autoApplyMinScore))
              ),
            }
          : {}),
        ...(typeof cd.autoApplyMarkApplied === "boolean"
          ? { autoApplyMarkApplied: cd.autoApplyMarkApplied }
          : {}),
        ...(typeof cd.autoApplyFollowUpDays === "number"
          ? {
              autoApplyFollowUpDays: Math.max(
                0,
                Math.min(60, Math.round(cd.autoApplyFollowUpDays))
              ),
            }
          : {}),
        ...(cd.slackWebhookUrl !== undefined
          ? { slackWebhookUrl: cd.slackWebhookUrl?.trim() || null }
          : {}),
        ...(typeof cd.inAppAlertsEnabled === "boolean"
          ? { inAppAlertsEnabled: cd.inAppAlertsEnabled }
          : {}),
        ...(typeof cd.interviewRemindersEnabled === "boolean"
          ? { interviewRemindersEnabled: cd.interviewRemindersEnabled }
          : {}),
      },
    })
  }

  const prefs = await prisma.jobPreferences.findUnique({
    where: { userId: user.id },
  })
  const health = await getCrawlHealth(user.id)

  return NextResponse.json({
    emailAccount: serializeEmailAccount(emailAccount),
    crawlDefaults: {
      remoteOnly: prefs?.remoteOnly ?? true,
      scheduledCrawlEnabled: prefs?.scheduledCrawlEnabled ?? false,
      crawlIntervalHours: prefs?.crawlIntervalHours ?? 6,
      excludeKeywords: prefs?.excludeKeywords ?? [],
      includeKeywords: prefs?.includeKeywords ?? [],
      targetRoles: prefs?.targetRoles ?? [],
      alertsEnabled: prefs?.alertsEnabled ?? true,
      alertMinScore: prefs?.alertMinScore ?? 55,
      lastAlertedAt: prefs?.lastAlertedAt ?? null,
      followUpRemindersEnabled: prefs?.followUpRemindersEnabled ?? true,
      autoApplyEnabled: prefs?.autoApplyEnabled ?? false,
      autoApplyMinScore: prefs?.autoApplyMinScore ?? 70,
      autoApplyMarkApplied: prefs?.autoApplyMarkApplied ?? true,
      autoApplyFollowUpDays: prefs?.autoApplyFollowUpDays ?? 7,
      slackWebhookUrl: prefs?.slackWebhookUrl ?? "",
      inAppAlertsEnabled: prefs?.inAppAlertsEnabled ?? true,
      interviewRemindersEnabled: prefs?.interviewRemindersEnabled ?? true,
    },
    crawlHealth: health,
  })
}
