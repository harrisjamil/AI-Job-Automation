"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ExternalLinkIcon, MailIcon, RadarIcon } from "lucide-react"

export type JobListItem = {
  id: string
  title: string
  company: string | null
  location: string | null
  isRemote: boolean
  source: string
  url: string
  matchScore: number
  salary: string | null
  skillsMatched: string[]
  scrapedAt: string
  contacts: Array<{
    id: string
    email: string
    name: string | null
    confidence: number
  }>
  _count: {
    contacts: number
    outreachEmails: number
  }
}

export function JobsTable({
  jobs,
  loading,
  onSelect,
  onEnrich,
  enrichingId,
}: {
  jobs: JobListItem[]
  loading?: boolean
  onSelect: (job: JobListItem) => void
  onEnrich: (jobId: string) => void
  enrichingId?: string | null
}) {
  if (loading) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Loading jobs…
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 p-8 text-center">
        <p className="font-medium">No jobs yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete your profile with skills and keywords, then run a global search.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Match</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-b last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="text-lg font-semibold tabular-nums">
                      {job.matchScore}
                    </span>
                    {job.isRemote ? (
                      <Badge variant="secondary">Remote</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">
                  <button
                    type="button"
                    className="text-left font-medium hover:underline"
                    onClick={() => onSelect(job)}
                  >
                    {job.title}
                  </button>
                  <p className="mt-0.5 text-muted-foreground">
                    {job.company || "Unknown company"}
                    {job.location ? ` · ${job.location}` : ""}
                  </p>
                  {job.skillsMatched.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.skillsMatched.slice(0, 4).map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 align-top capitalize text-muted-foreground">
                  {job.source}
                </td>
                <td className="px-4 py-3 align-top">
                  {job._count.contacts > 0 ? (
                    <div className="flex items-center gap-1.5 text-foreground">
                      <MailIcon className="size-3.5" />
                      <span>{job.contacts[0]?.email}</span>
                      {job._count.contacts > 1 ? (
                        <span className="text-muted-foreground">
                          +{job._count.contacts - 1}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No email yet</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelect(job)}
                    >
                      Open
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={enrichingId === job.id}
                      onClick={() => onEnrich(job.id)}
                    >
                      <RadarIcon className="size-3.5" />
                      {enrichingId === job.id ? "Finding…" : "Find email"}
                    </Button>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open job posting"
                      className="inline-flex size-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <ExternalLinkIcon className="size-3.5" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
