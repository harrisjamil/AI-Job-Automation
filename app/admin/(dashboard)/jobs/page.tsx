"use client"

import { DiscoverJobsPanel } from "@/components/admin/discover-jobs-panel"

export default function JobsPage() {
  return (
    <div className="mx-auto flex w-full max-w-8xl flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Discover Jobs</h2>
        <p className="text-muted-foreground">
          AI searches worldwide job boards from your skills and keywords — not a
          single role — then ranks remote and related openings for you.
        </p>
      </div>
      <DiscoverJobsPanel />
    </div>
  )
}
