"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import {
  ClipboardListIcon,
  ExternalLinkIcon,
  Loader2Icon,
  Trash2Icon,
} from "lucide-react"
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
} from "@/lib/applications"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type ApplicationRow = {
  id: string
  status: ApplicationStatus
  notes: string | null
  followUpAt: string | null
  appliedAt: string | null
  statusChangedAt: string
  updatedAt: string
  job: {
    id: string
    title: string
    company: string | null
    location: string | null
    url: string
    matchScore: number
    isRemote: boolean
    source: string
    salary: string | null
    postedAt: string | null
  }
}

export function ApplicationsTrackerPanel() {
  const [applications, setApplications] = useState<ApplicationRow[]>([])
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({})
  const [filter, setFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const query = filter === "all" ? "" : `?status=${filter}`
      const response = await fetch(`/api/applications${query}`)
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Failed to load applications")
        return
      }
      setApplications(data.applications ?? [])
      setStatusCounts(data.statusCounts ?? {})
    } catch {
      toast.error("Failed to load applications")
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const total = useMemo(
    () => Object.values(statusCounts).reduce((sum, n) => sum + n, 0),
    [statusCounts]
  )

  const dueSoon = useMemo(() => {
    const now = Date.now()
    const week = 7 * 24 * 60 * 60 * 1000
    return applications.filter((app) => {
      if (!app.followUpAt) return false
      const t = new Date(app.followUpAt).getTime()
      return t <= now + week
    }).length
  }, [applications])

  async function updateApplication(
    id: string,
    patch: {
      status?: string
      notes?: string
      followUpAt?: string | null
    }
  ) {
    setSavingId(id)
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Update failed")
        return
      }
      toast.success("Application updated")
      await load()
    } catch {
      toast.error("Update failed")
    } finally {
      setSavingId(null)
    }
  }

  async function removeApplication(id: string) {
    setSavingId(id)
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error ?? "Could not remove")
        return
      }
      toast.success("Removed from tracker")
      await load()
    } catch {
      toast.error("Could not remove")
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          <ClipboardListIcon className="mr-1 size-3" />
          {total} tracked
        </Badge>
        {dueSoon > 0 ? (
          <Badge variant="outline">{dueSoon} follow-up due soon</Badge>
        ) : null}
        {APPLICATION_STATUSES.map((status) => (
          <Badge key={status} variant="outline" className="capitalize">
            {APPLICATION_STATUS_LABELS[status]} {statusCounts[status] ?? 0}
          </Badge>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-2">
          <Label>Filter status</Label>
          <Select value={filter} onValueChange={(value) => setFilter(value ?? "all")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {APPLICATION_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {APPLICATION_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          Loading applications…
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <p className="font-medium">No applications tracked yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a job in Discover Jobs and click &quot;Track application&quot; to
            start the pipeline.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {applications.map((app) => (
            <li
              key={app.id}
              className="rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{app.job.title}</p>
                    <Badge>Score {app.job.matchScore}</Badge>
                    {app.job.isRemote ? (
                      <Badge variant="secondary">Remote</Badge>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {[app.job.company, app.job.location, app.job.source]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a href={app.job.url} target="_blank" rel="noreferrer" />
                    }
                  >
                    <ExternalLinkIcon className="size-3.5" />
                    Apply link
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={savingId === app.id}
                    onClick={() => void removeApplication(app.id)}
                  >
                    <Trash2Icon className="size-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={app.status}
                    onValueChange={(value) => {
                      if (value) void updateApplication(app.id, { status: value })
                    }}
                    disabled={savingId === app.id}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLICATION_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {APPLICATION_STATUS_LABELS[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Follow up</Label>
                  <Input
                    type="date"
                    defaultValue={
                      app.followUpAt
                        ? new Date(app.followUpAt).toISOString().slice(0, 10)
                        : ""
                    }
                    onBlur={(event) => {
                      const value = event.target.value
                      void updateApplication(app.id, {
                        followUpAt: value || null,
                      })
                    }}
                    disabled={savingId === app.id}
                  />
                </div>
                <div className="space-y-2 md:col-span-1">
                  <Label>Applied</Label>
                  <p className="text-sm text-muted-foreground">
                    {app.appliedAt
                      ? new Date(app.appliedAt).toLocaleDateString()
                      : "Not applied yet"}
                  </p>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  defaultValue={app.notes ?? ""}
                  placeholder="Interview date, recruiter name, next step…"
                  onBlur={(event) => {
                    if (event.target.value !== (app.notes ?? "")) {
                      void updateApplication(app.id, {
                        notes: event.target.value,
                      })
                    }
                  }}
                  disabled={savingId === app.id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
