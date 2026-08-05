"use client"

import { EmailSettingsForm } from "@/components/admin/email-settings-form"
import { ExtensionTokenPanel } from "@/components/admin/extension-token-panel"

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure email, crawl health, alerts (in-app / Slack), auto-apply,
          IMAP reply sync, and the Chrome form-fill extension.
        </p>
      </div>
      <ExtensionTokenPanel />
      <EmailSettingsForm />
    </div>
  )
}
