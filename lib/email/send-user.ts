import nodemailer from "nodemailer"
import { prisma } from "@/lib/prisma"

type SendUserEmailOptions = {
  userId: string
  to: string
  subject: string
  text: string
  html?: string
}

/**
 * Send a transactional email to the user using their configured
 * Resend/SMTP account (or env fallbacks).
 */
export async function sendUserEmail(options: SendUserEmailOptions) {
  const account = await prisma.emailAccount.findUnique({
    where: { userId: options.userId },
  })

  const envResendKey = process.env.RESEND_API_KEY
  const provider = account?.provider ?? (envResendKey ? "resend" : null)
  const fromEmail =
    account?.fromEmail ||
    process.env.RESEND_FROM_EMAIL ||
    process.env.SMTP_FROM_EMAIL
  const fromName =
    account?.fromName || process.env.RESEND_FROM_NAME || "AI Job Automation"

  if (!provider || !fromEmail) {
    throw new Error(
      "Configure an email account in Settings (Resend or SMTP) before sending alerts."
    )
  }

  if (provider === "resend") {
    const apiKey = account?.apiKey || envResendKey
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
        to: [options.to],
        subject: options.subject,
        text: options.text,
        ...(options.html ? { html: options.html } : {}),
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

    return { providerMessageId: data?.id ?? null }
  }

  if (provider === "smtp") {
    const host = account?.smtpHost || process.env.SMTP_HOST
    const port = account?.smtpPort || Number(process.env.SMTP_PORT || 587)
    const user = account?.smtpUser || process.env.SMTP_USER
    const pass = account?.smtpPass || process.env.SMTP_PASS
    const secure = account?.smtpSecure ?? process.env.SMTP_SECURE === "true"

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
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    })

    return { providerMessageId: info.messageId ?? null }
  }

  throw new Error(`Unsupported email provider: ${provider}`)
}
