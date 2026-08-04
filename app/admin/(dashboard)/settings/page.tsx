"use client"

import { EmailSettingsForm } from "@/components/admin/email-settings-form"

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Configure outbound email and default crawl preferences for worldwide
          job discovery.
        </p>
      </div>
      <EmailSettingsForm />
    </div>
  )
}
