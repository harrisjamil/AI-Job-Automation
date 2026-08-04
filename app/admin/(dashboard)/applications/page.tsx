"use client"

import { OutreachPanel } from "@/components/admin/outreach-panel"

export default function OutreachPage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Contacts & Outreach
        </h2>
        <p className="text-muted-foreground">
          Review extracted emails, AI-draft messages from your profile and CV,
          then send outreach from the app.
        </p>
      </div>
      <OutreachPanel />
    </div>
  )
}
