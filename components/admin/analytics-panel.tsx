"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"

type Summary = {
  jobsTotal: number
  statusCounts: Record<string, number>
  outreachSent: number
  outreachDrafts: number
  replied: number
  awaiting: number
  appliedThisWeek: number
  appliedThisMonth: number
  appliedCount: number
  responseRate: number
  avgMatchOfApplied: number | null
  readyPackages: number
  interviews: number
  topSources: Array<{
    source: string
    jobs: number
    avgMatch: number | null
  }>
}

export function AnalyticsPanel() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/analytics")
        const data = await response.json()
        if (!response.ok) {
          toast.error(data.error ?? "Failed to load analytics")
          return
        }
        setSummary(data.summary)
      } catch {
        toast.error("Failed to load analytics")
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Loading analytics…
      </p>
    )
  }

  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">No analytics available.</p>
    )
  }

  const cards = [
    { label: "Jobs discovered", value: summary.jobsTotal },
    { label: "Applied (pipeline)", value: summary.appliedCount },
    { label: "Applied this week", value: summary.appliedThisWeek },
    { label: "Applied this month", value: summary.appliedThisMonth },
    { label: "Outreach sent", value: summary.outreachSent },
    { label: "Reply rate", value: `${summary.responseRate}%` },
    { label: "Replies tracked", value: summary.replied },
    { label: "Awaiting reply", value: summary.awaiting },
    { label: "Interviews", value: summary.interviews },
    {
      label: "Avg match (applied)",
      value: summary.avgMatchOfApplied ?? "—",
    },
    { label: "Ready apply packages", value: summary.readyPackages },
    { label: "Outreach drafts", value: summary.outreachDrafts },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            <p className="mt-2 text-3xl font-semibold tracking-tight">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border">
        <div className="border-b px-5 py-3">
          <h3 className="font-medium">Pipeline by status</h3>
        </div>
        <ul className="divide-y">
          {Object.entries(summary.statusCounts).map(([status, count]) => (
            <li
              key={status}
              className="flex items-center justify-between px-5 py-3 text-sm"
            >
              <span className="capitalize">{status}</span>
              <span className="font-medium tabular-nums">{count}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border">
        <div className="border-b px-5 py-3">
          <h3 className="font-medium">Top sources</h3>
        </div>
        {summary.topSources.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">
            Run a crawl to see source quality.
          </p>
        ) : (
          <ul className="divide-y">
            {summary.topSources.map((row) => (
              <li
                key={row.source}
                className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
              >
                <span className="capitalize">{row.source}</span>
                <span className="text-muted-foreground">
                  {row.jobs} jobs
                  {row.avgMatch != null ? ` · avg ${row.avgMatch}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
