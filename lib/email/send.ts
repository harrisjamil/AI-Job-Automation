import nodemailer from "nodemailer"
import { decryptSecret, maskRevealedSecret } from "@/lib/crypto/secrets"
import { prisma } from "@/lib/prisma"

export function serializeEmailAccount(
  account: {
    id: string
    provider: string
    fromEmail: string
    fromName: string | null
    apiKey: string | null
    smtpHost: string | null
    smtpPort: number | null
    smtpUser: string | null
    smtpPass: string | null
    smtpSecure: boolean
    isActive: boolean
    imapHost?: string | null
    imapPort?: number | null
    imapUser?: string | null
    imapPass?: string | null
    imapSecure?: boolean
    replySyncEnabled?: boolean
    lastReplySyncAt?: Date | null
  } | null
) {
  if (!account) return null
  return {
    id: account.id,
    provider: account.provider,
    fromEmail: account.fromEmail,
    fromName: account.fromName,
    apiKeyMasked: maskRevealedSecret(account.apiKey),
    hasApiKey: Boolean(account.apiKey),
    smtpHost: account.smtpHost,
    smtpPort: account.smtpPort,
    smtpUser: account.smtpUser,
    hasSmtpPass: Boolean(account.smtpPass),
    smtpSecure: account.smtpSecure,
    isActive: account.isActive,
    imapHost: account.imapHost ?? null,
    imapPort: account.imapPort ?? null,
    imapUser: account.imapUser ?? null,
    hasImapPass: Boolean(account.imapPass),
    imapSecure: account.imapSecure ?? true,
    replySyncEnabled: account.replySyncEnabled ?? false,
    lastReplySyncAt: account.lastReplySyncAt ?? null,
  }
}

export async function sendOutreachEmail(outreachId: string, userId: string) {
  const outreach = await prisma.outreachEmail.findFirst({
    where: { id: outreachId, userId },
  })

  if (!outreach) {
    throw new Error("Outreach email not found")
  }

  if (outreach.status === "sent") {
    throw new Error("This email was already sent")
  }

  const account = await prisma.emailAccount.findUnique({
    where: { userId },
  })

  const envResendKey = process.env.RESEND_API_KEY
  const provider = account?.provider ?? (envResendKey ? "resend" : null)
  const fromEmail =
    account?.fromEmail ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.SMTP_FROM_EMAIL
  const fromName =
    account?.fromName || process.env.RESEND_FROM_NAME || "Job Outreach"

  if (!provider || !fromEmail) {
    throw new Error(
      "Configure an email account in Settings (Resend or SMTP) before sending."
    )
  }

  await prisma.outreachEmail.update({
    where: { id: outreach.id },
    data: { status: "queued", error: null },
  })

  try {
    let providerMessageId: string | null = null

    if (provider === "resend") {
      const apiKey = decryptSecret(account?.apiKey) || envResendKey
      if (!apiKey) {
        throw new Error("Resend API key is missing")
      }

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromName ? `${fromName} <${fromEmail}>` : fromEmail,
          to: [outreach.toEmail],
          subject: outreach.subject,
          text: outreach.body,
        }),
      })

      const data = (await response.json().catch(() => null)) as {
        id?: string
        message?: string
        error?: { message?: string }
      } | null

      if (!response.ok) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            `Resend failed with status ${response.status}`
        )
      }

      providerMessageId = data?.id ?? null
    } else if (provider === "smtp") {
      const host = account?.smtpHost || process.env.SMTP_HOST
      const port = account?.smtpPort || Number(process.env.SMTP_PORT || 587)
      const user = account?.smtpUser || process.env.SMTP_USER
      const pass =
        decryptSecret(account?.smtpPass) || process.env.SMTP_PASS || null
      const secure =
        account?.smtpSecure ?? process.env.SMTP_SECURE === "true"

      if (!host || !user || !pass) {
        throw new Error("SMTP host/user/password are required")
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      })

      const info = await transporter.sendMail({
        from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
        to: outreach.toEmail,
        subject: outreach.subject,
        text: outreach.body,
      })

      providerMessageId = info.messageId ?? null
    } else {
      throw new Error(`Unsupported email provider: ${provider}`)
    }

    return prisma.outreachEmail.update({
      where: { id: outreach.id },
      data: {
        status: "sent",
        providerMessageId,
        sentAt: new Date(),
        error: null,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send email"

    await prisma.outreachEmail.update({
      where: { id: outreach.id },
      data: {
        status: "failed",
        error: message,
      },
    })

    throw error
  }
}
