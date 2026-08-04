"use client"

import { ApplicationsTrackerPanel } from "@/components/admin/applications-tracker-panel"
import { OutreachPanel } from "@/components/admin/outreach-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ApplicationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Applications</h2>
        <p className="text-muted-foreground">
          Track saved → applied → interview pipelines, then draft and send
          outreach from extracted contacts.
        </p>
      </div>

      <Tabs defaultValue="tracker">
        <TabsList>
          <TabsTrigger value="tracker">Tracker</TabsTrigger>
          <TabsTrigger value="outreach">Contacts & Outreach</TabsTrigger>
        </TabsList>
        <TabsContent value="tracker" className="pt-4">
          <ApplicationsTrackerPanel />
        </TabsContent>
        <TabsContent value="outreach" className="pt-4">
          <OutreachPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
