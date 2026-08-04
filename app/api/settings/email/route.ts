import { NextResponse } from "next/server"
import { serializeEmailAccount } from "@/lib/email/send"
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

  return NextResponse.json({
    emailAccount: serializeEmailAccount(account),
    crawlDefaults: {
      remoteOnly: prefs?.remoteOnly ?? true,
      scheduledCrawlEnabled: prefs?.scheduledCrawlEnabled ?? false,
      crawlIntervalHours: prefs?.crawlIntervalHours ?? 6,
      excludeKeywords: prefs?.excludeKeywords ?? [],
      includeKeywords: prefs?.includeKeywords ?? [],
      targetRoles: prefs?.targetRoles ?? [],
    },
    envHints: {
      hasResendEnv: Boolean(process.env.RESEND_API_KEY),
      hasSmtpEnv: Boolean(process.env.SMTP_HOST),
      hasAdzunaEnv: Boolean(
        process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY
      ),
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
    }
    crawlDefaults?: {
      remoteOnly?: boolean
      scheduledCrawlEnabled?: boolean
      crawlIntervalHours?: number
      excludeKeywords?: string[]
      includeKeywords?: string[]
      targetRoles?: string[]
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
        ? ea.apiKey.trim()
        : existing?.apiKey
    const smtpPass = ea.clearSmtpPass
      ? null
      : ea.smtpPass?.trim()
        ? ea.smtpPass.trim()
        : existing?.smtpPass

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
        excludeKeywords: cd.excludeKeywords ?? [],
        includeKeywords: cd.includeKeywords ?? [],
        targetRoles: cd.targetRoles ?? [],
      },
      update: {
        ...(typeof cd.remoteOnly === "boolean"
          ? { remoteOnly: cd.remoteOnly }
          : {}),
        ...(typeof cd.scheduledCrawlEnabled === "boolean"
          ? { scheduledCrawlEnabled: cd.scheduledCrawlEnabled }
          : {}),
        ...(typeof cd.crawlIntervalHours === "number"
          ? { crawlIntervalHours: Math.max(1, Math.min(168, cd.crawlIntervalHours)) }
          : {}),
        ...(cd.excludeKeywords
          ? { excludeKeywords: cd.excludeKeywords }
          : {}),
        ...(cd.includeKeywords
          ? { includeKeywords: cd.includeKeywords }
          : {}),
        ...(cd.targetRoles ? { targetRoles: cd.targetRoles } : {}),
      },
    })
  }

  const prefs = await prisma.jobPreferences.findUnique({
    where: { userId: user.id },
  })

  return NextResponse.json({
    emailAccount: serializeEmailAccount(emailAccount),
    crawlDefaults: {
      remoteOnly: prefs?.remoteOnly ?? true,
      scheduledCrawlEnabled: prefs?.scheduledCrawlEnabled ?? false,
      crawlIntervalHours: prefs?.crawlIntervalHours ?? 6,
      excludeKeywords: prefs?.excludeKeywords ?? [],
      includeKeywords: prefs?.includeKeywords ?? [],
      targetRoles: prefs?.targetRoles ?? [],
    },
  })
}
