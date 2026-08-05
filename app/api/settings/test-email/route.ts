import { NextResponse } from "next/server"
import { sendUserEmail } from "@/lib/email/send-user"
import { getCurrentUser } from "@/lib/session"

export async function POST() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await sendUserEmail({
      userId: user.id,
      to: user.email,
      subject: "AI Job Automation — test email",
      text: `Hi ${user.fullName.split(" ")[0] || "there"},

This is a test email from your AI Job Automation settings. Outbound email is working.

— AI Job Automation`,
      html: `<p>Hi ${user.fullName.split(" ")[0] || "there"},</p><p>This is a <strong>test email</strong> from your AI Job Automation settings. Outbound email is working.</p><p style="color:#666;font-size:12px">AI Job Automation</p>`,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send test email"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
